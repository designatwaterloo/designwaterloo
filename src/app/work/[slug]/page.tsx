import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import { notFound } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
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
        <section className="grid-section !gap-y-[var(--small)]">
          <h1 className="col-span-full">{project.title}</h1>

          {/* Project Info */}
          <div className="col-span-full grid grid-cols-12 gap-x-[var(--gap)] gap-y-1">
            <p className="uppercase text-[#7f7f7f] col-span-2 col-start-1">Client</p>
            <p className="col-span-2 col-start-3">{project.client}</p>

            <p className="uppercase text-[#7f7f7f] col-span-2 col-start-1">Date</p>
            <p className="col-span-2 col-start-3">{project.yearCompleted}</p>

            {project.category && (
              <>
                <p className="uppercase text-[#7f7f7f] col-span-2 col-start-1">Category</p>
                <p className="col-span-2 col-start-3 capitalize">{project.category.replace("-", " ")}</p>
              </>
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
              <p className="uppercase text-[#7f7f7f] mb-2">Year</p>
              <p>{project.yearCompleted}</p>
            </div>

            {project.description && (
              <div>
                <p className="uppercase text-[#7f7f7f] mb-2">About</p>
                <div className="prose prose-sm">
                  <PortableText value={project.description} />
                </div>
              </div>
            )}

            {project.tools && project.tools.length > 0 && (
              <div>
                <p className="uppercase text-[#7f7f7f] mb-2">Tools</p>
                <p>{project.tools.join(", ")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Scrollable Images */}
        <div className="col-span-8 flex flex-col gap-[var(--gap)] max-lg:col-span-full">
          {project.projectImages && project.projectImages.length > 0 ? (
            project.projectImages
              .filter((image) => image?.asset?._ref) // Filter out invalid images
              .map((image) => {
                const imageUrl = urlFor(image).width(1920).height(1080).url();
                return (
                  <Image
                    key={image._key}
                    src={imageUrl}
                    alt={image.alt || project.title}
                    width={1920}
                    height={1080}
                    className="w-full h-auto bg-gray-200"
                    sizes="(max-width: 768px) 100vw, 66vw"
                  />
                );
              })
          ) : (
            <p className="text-gray-500">No project images yet. Add some in Sanity Studio!</p>
          )}
        </div>
      </section>

      {/* Credits Section */}
      <section className="grid-section">
        {/* Sticky Left Sidebar */}
        <div className="col-span-4 sticky top-[calc(var(--small)*4)] self-start pr-[var(--smaller)] max-lg:col-span-full max-lg:static max-lg:pr-0 max-lg:mb-[var(--small)]">
          <div className="flex flex-col gap-[var(--small)]">
            <p className="uppercase text-[#7f7f7f]">Credits</p>
            
            <div className="flex flex-col gap-1">
              <p className=" text-[#7f7f7f]">Design</p>
              <p>Brayden Petersen</p>
              <p>Sheffield Wong</p>
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-[#7f7f7f]">Development</p>
              <p>Brayden Petersen</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[#7f7f7f]">Development</p>
              <p>Brayden Petersen</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[#7f7f7f]">Development</p>
              <p>Brayden Petersen</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[#7f7f7f]">Development</p>
              <p>Brayden Petersen</p>
            </div>
          </div>
        </div>

        {/* Right People Grid */}
        <div className="col-span-8 grid grid-cols-6 gap-[var(--gap)] max-lg:col-span-full">
          {/* Person 1 */}
          <div className="flex flex-col gap-2">
            <Image
              src="/NYA00500-3.png"
              alt="Sheffield Wong"
              width={300}
              height={400}
              className="w-full aspect-[3/4] object-cover rounded bg-gray-200"
              sizes="(max-width: 768px) 50vw, 12vw"
            />
            <p className="font-semibold">Sheffield Wong</p>
            <p className="text-[#7f7f7f]">Product Designer</p>
          </div>

          {/* Person 2 */}
          <div className="flex flex-col gap-2">
            <Image
              src="/NYA00500-3.png"
              alt="Sheffield Wong"
              width={300}
              height={400}
              className="w-full aspect-[3/4] object-cover rounded bg-gray-200"
              sizes="(max-width: 768px) 50vw, 12vw"
            />
            <p className="font-semibold">Sheffield Wong</p>
            <p className="text-[#7f7f7f]">Design</p>
          </div>

          {/* Person 3 */}
          <div className="flex flex-col gap-2">
            <Image
              src="/NYA00500-3.png"
              alt="Sheffield Wong"
              width={300}
              height={400}
              className="w-full aspect-[3/4] object-cover rounded bg-gray-200"
              sizes="(max-width: 768px) 50vw, 12vw"
            />
            <p className="font-semibold">Sheffield Wong</p>
            <p className="text-[#7f7f7f]">Design</p>
          </div>

          {/* Person 4 */}
          <div className="flex flex-col gap-2">
            <Image
              src="/NYA00500-3.png"
              alt="Sheffield Wong"
              width={300}
              height={400}
              className="w-full aspect-[3/4] object-cover rounded bg-gray-200"
              sizes="(max-width: 768px) 50vw, 12vw"
            />
            <p className="font-semibold">Sheffield Wong</p>
            <p className="text-[#7f7f7f]">Design</p>
          </div>

          {/* Person 5 */}
          <div className="flex flex-col gap-2">
            <Image
              src="/NYA00500-3.png"
              alt="Sheffield Wong"
              width={300}
              height={400}
              className="w-full aspect-[3/4] object-cover rounded bg-gray-200"
              sizes="(max-width: 768px) 50vw, 12vw"
            />
            <p className="font-semibold">Sheffield Wong</p>
            <p className="text-[#7f7f7f]">Design</p>
          </div>

          {/* Person 6 */}
          <div className="flex flex-col gap-2">
            <Image
              src="/NYA00500-3.png"
              alt="Sheffield Wong"
              width={300}
              height={400}
              className="w-full aspect-[3/4] object-cover rounded bg-gray-200"
              sizes="(max-width: 768px) 50vw, 12vw"
            />
            <p className="font-semibold">Sheffield Wong</p>
            <p className="text-[#7f7f7f]">Design</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
