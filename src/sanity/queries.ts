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

// Query to get all members (for directory listing page)
export const membersQuery = groq`
  *[_type == "member" && defined(slug.current)] | order(firstName asc) {
    _id,
    _createdAt,
    memberId,
    firstName,
    lastName,
    slug,
    profileImage {
      asset,
      hotspot,
      crop
    },
    school,
    program,
    graduatingClass,
    specialties,
    workSchedule
  }
`;

// Query to get a single member by slug
export const memberBySlugQuery = groq`
  *[_type == "member" && slug.current == $slug][0] {
    _id,
    _createdAt,
    memberId,
    firstName,
    lastName,
    slug,
    profileImage {
      asset,
      hotspot,
      crop
    },
    school,
    program,
    graduatingClass,
    bio,
    experience[] {
      positionTitle,
      company,
      dateStart,
      isCurrent
    },
    leadership[] {
      positionTitle,
      org,
      dateStart,
      isCurrent
    },
    work[]-> {
      _id,
      title,
      slug,
      yearCompleted,
      client
    },
    publicEmail,
    schoolEmail,
    instagram,
    twitter,
    linkedin,
    github,
    portfolio,
    behance,
    dribbble,
    specialties,
    workSchedule
  }
`;

// Query to get all member slugs (for generateStaticParams)
export const memberSlugsQuery = groq`
  *[_type == "member" && defined(slug.current)] {
    "slug": slug.current
  }
`;
