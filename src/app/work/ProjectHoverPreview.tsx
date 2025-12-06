import Image from "next/image";
import { Project } from "@/sanity/types";
import { urlFor, getBlurDataURL } from "@/sanity/lib/image";

interface ProjectHoverPreviewProps {
  project: Project;
}

/**
 * ProjectHoverPreview - Hover preview image for table rows
 *
 * Displays project featured image when hovering over table row
 */
export default function ProjectHoverPreview({ project }: ProjectHoverPreviewProps) {
  const featuredImage =
    project.featuredMedia?.mediaType === "image" ? project.featuredMedia.image : null;

  if (!featuredImage) {
    return null;
  }

  return (
    <Image
      src={urlFor(featuredImage).width(300).height(225).url()}
      alt={project.featuredMedia?.alt || project.title}
      width={300}
      height={225}
      style={{
        width: "100%",
        height: "auto",
        aspectRatio: "4/3",
        objectFit: "cover",
        borderRadius: "4px",
      }}
      placeholder={getBlurDataURL(featuredImage) ? "blur" : "empty"}
      blurDataURL={getBlurDataURL(featuredImage)}
    />
  );
}
