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
    liveUrl,
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
      asset-> {
        _id,
        url,
        metadata {
          lqip,
          dimensions {
            width,
            height
          }
        }
      },
      hotspot,
      crop,
      alt,
      caption
    },
    description,
    members[] {
      role,
      member-> {
        _id,
        firstName,
        lastName,
        slug,
        profileImage {
          asset-> {
            _id,
            url,
            metadata {
              lqip
            }
          }
        },
        specialties
      }
    }
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
  *[_type == "member" && defined(slug.current)] | order(memberId asc) {
    _id,
    _createdAt,
    memberId,
    firstName,
    lastName,
    slug,
    profileImage {
      asset-> {
        _id,
        url,
        metadata {
          lqip
        }
      },
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
      asset-> {
        _id,
        url,
        metadata {
          lqip
        }
      },
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
      startMonth,
      startYear,
      isCurrent
    },
    leadership[] {
      positionTitle,
      "org": organization->name,
      startMonth,
      startYear,
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

// Query to get projects where a specific member is credited
export const projectsByMemberQuery = groq`
  *[_type == "project" && references($memberId)] | order(yearCompleted desc) {
    _id,
    title,
    slug,
    yearCompleted,
    client,
    "role": members[member._ref == $memberId][0].role,
    featuredMedia {
      mediaType,
      image {
        asset-> {
          _id,
          url,
          metadata {
            lqip
          }
        }
      },
      alt
    }
  }
`;

// Query to get all resources (for listing page)
export const resourcesQuery = groq`
  *[_type == "resource"] | order(order asc, title asc) {
    _id,
    title,
    description,
    logo {
      asset-> {
        _id,
        url,
        metadata {
          lqip
        }
      }
    },
    link,
    price,
    category
  }
`;
