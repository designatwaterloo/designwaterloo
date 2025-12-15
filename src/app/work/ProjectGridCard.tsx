import Image from "next/image";
import Link from "@/components/Link";
import { Project } from "@/sanity/types";
import { urlFor, getBlurDataURL } from "@/sanity/lib/image";

interface ProjectGridCardProps {
  project: Project;
  onClick?: () => void;
}

/**
 * ProjectGridCard - Grid card component for displaying a project
 *
 * Displays project featured image (4:3 aspect ratio), title, client, and year
 */
export default function ProjectGridCard({ project, onClick }: ProjectGridCardProps) {
  const featuredImage = project.featuredMedia?.mediaType === "image"
    ? project.featuredMedia.image
    : null;

  return (
    <Link
      href={`/work/${project.slug.current}`}
      className="flex flex-col gap-4 group"
      underline={false}
      onClick={onClick}
    >
      {featuredImage ? (
        <Image
          src={urlFor(featuredImage).width(800).height(600).url()}
          alt={project.featuredMedia?.alt || project.title}
          width={800}
          height={600}
          className="aspect-[4/3] w-full object-cover rounded"
          placeholder={getBlurDataURL(featuredImage) ? "blur" : "empty"}
          blurDataURL={getBlurDataURL(featuredImage)}
        />
      ) : (
        <div className="aspect-[4/3] bg-[#d9d9d9] rounded" />
      )}
      <div className="flex flex-col gap-0">
        <p className="text-[var(--foreground)]">{project.title}</p>
        <p>{project.client}</p>
        <p className="py-2">{project.yearCompleted}</p>
      </div>
    </Link>
  );
}
