import { groq } from "next-sanity";

// Query to get all projects (for listing page)
export const projectsQuery = groq`
  *[_type == "project"] | order(yearCompleted desc) {
    _id,
    title,
    slug,
    yearCompleted,
    client,
    category,
    featuredMedia {
      mediaType,
      image {
        asset,
        hotspot,
        crop
      },
      alt
    }
  }
`;

// Query to get a single project by slug
export const projectBySlugQuery = groq`
  *[_type == "project" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    yearCompleted,
    client,
    category,
    tools,
    featuredMedia {
      mediaType,
      image {
        asset,
        hotspot,
        crop
      },
      video {
        asset
      },
      alt
    },
    projectImages[] {
      _key,
      asset,
      hotspot,
      crop,
      alt,
      caption
    },
    description
  }
`;

// Query to get all project slugs (for generateStaticParams)
export const projectSlugsQuery = groq`
  *[_type == "project" && defined(slug.current)] {
    "slug": slug.current
  }
`;
