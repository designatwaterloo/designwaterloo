import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "@/components/Link";
import Image from "next/image";
import CreditsGrid from "./CreditsGrid";
import { notFound } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { urlFor, getBlurDataURL } from "@/sanity/lib/image";
import { projectBySlugQuery, projectSlugsQuery } from "@/sanity/queries";
import type { Project } from "@/sanity/types";
import { PortableText } from "next-sanity";

// Revalidate every 30 seconds
export const revalidate = 30;

// Generate static params for all projects
export async function generateStaticParams() {
  const projects = await client.fetch<{ slug: string }[]>(projectSlugsQuery);
  return projects.map((project) => ({
    slug: project.slug,
  }));
}

export default async function WorkDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Fetch project data from Sanity
  const project: Project | null = await client.fetch(projectBySlugQuery, { slug });

  if (!project) {
    notFound();
  }

  // Get featured image URL
  const featuredImageUrl = project.featuredMedia?.image
    ? urlFor(project.featuredMedia.image).width(1920).height(1080).url()
    : null;

  return (
    <div>
      <Header />

      <main>
        <Link href="/work" className="inline-block mx-[var(--margin)] my-[var(--huge)] text-[var(--smallest)] text-[var(--foreground)] no-underline hover:text-blue-500" underline={false}>
          ← Back to work
        </Link>
        <section className="grid-section !gap-y-[var(--small)]">
          {project.liveUrl ? (
            <a 
              href={project.liveUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="col-span-full flex items-baseline gap-3 group"
            >
              <h1 className="group-hover:underline">{project.title}</h1>
              <span className="text-[1.5rem] text-[#7f7f7f] group-hover:text-[var(--foreground)] transition-colors">↗</span>
            </a>
          ) : (
            <h1 className="col-span-full">{project.title}</h1>
          )}

          {/* Project Info */}
          <div className="col-span-full flex flex-col gap-[var(--gap)]">
            <div className="flex flex-col gap-1">
              <p className="text-[#7f7f7f]">Client</p>
              <p>{project.client}</p>
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-[#7f7f7f]">Date</p>
              <p>{project.yearCompleted}</p>
            </div>

            {project.category && (
              <div className="flex flex-col gap-1">
                <p className="text-[#7f7f7f]">Category</p>
                <p className="capitalize">{project.category.replace("-", " ")}</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Full Width Image Section */}
      {featuredImageUrl && (
        <section className="relative max-h-screen overflow-hidden p-0">
          <Image
            src={featuredImageUrl}
            alt={project.featuredMedia?.alt || project.title}
            width={1920}
            height={1080}
            className="w-full h-auto max-h-screen object-cover bg-gray-200"
            style={{ display: 'block' }}
            priority
            sizes="100vw"
          />
        </section>
      )}

      {/* Sticky Sidebar Section */}
      <section className="grid-section">
        {/* Sticky Left Sidebar */}
        <div className="col-span-4 sticky top-[calc(var(--small)*4)] self-start pr-[var(--smaller)] max-lg:col-span-full max-lg:static max-lg:pr-0 max-lg:mb-[var(--small)]">
          <div className="flex flex-col gap-[var(--small)]">
            <h2 className="max-lg:hidden">{project.title}</h2>
            <div>
              <p className="text-[#7f7f7f] mb-2">Year</p>
              <p>{project.yearCompleted}</p>
            </div>

            {project.description && (
              <div>
                <p className="text-[#7f7f7f] mb-2">About</p>
                <div className="prose prose-sm">
                  <PortableText value={project.description} />
                </div>
              </div>
            )}

            {project.tools && project.tools.length > 0 && (
              <div>
                <p className="text-[#7f7f7f] mb-2">Tools</p>
                <p>{project.tools.join(", ")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Scrollable Images */}
        <div className="col-span-8 flex flex-col gap-[var(--gap)] max-lg:col-span-full">
          {project.projectImages && project.projectImages.length > 0 ? (
            project.projectImages
              .filter((image) => image?.asset?._id) // Filter out invalid images (now using _id since dereferenced)
              .map((image) => {
                const dimensions = image.asset?.metadata?.dimensions;
                const width = dimensions?.width || 1920;
                const height = dimensions?.height || 1080;
                const imageUrl = image.asset?.url;
                
                if (!imageUrl) return null;
                
                const lqip = image.asset?.metadata?.lqip;
                
                return (
                  <Image
                    key={image._key}
                    src={imageUrl}
                    alt={image.alt || project.title}
                    width={width}
                    height={height}
                    className="w-full h-auto bg-gray-200"
                    sizes="(max-width: 768px) 100vw, 66vw"
                    placeholder={lqip ? "blur" : "empty"}
                    blurDataURL={lqip}
                  />
                );
              })
          ) : (
            <p className="text-gray-500">No project images yet. Add some in Sanity Studio!</p>
          )}
        </div>
      </section>

      {/* Credits Section - Only show if project has members */}
      {project.members && project.members.length > 0 && (
        <CreditsGrid members={project.members} />
      )}

      <Footer />
    </div>
  );
}
