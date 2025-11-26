import type { PortableTextBlock } from "next-sanity";

export interface SanityImage {
  _type: "image";
  asset: {
    _ref: string;
    _type: "reference";
  };
  hotspot?: {
    x: number;
    y: number;
    height: number;
    width: number;
  };
  crop?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface ProjectImage extends SanityImage {
  _key: string;
  alt?: string;
  caption?: string;
}

export interface FeaturedMedia {
  mediaType: "image" | "video";
  image?: SanityImage;
  video?: {
    asset: {
      _ref: string;
      _type: "reference";
    };
  };
  alt?: string;
}

export interface Project {
  _id: string;
  _type: "project";
  title: string;
  slug: {
    current: string;
  };
  yearCompleted: number;
  client: string;
  category?: "branding" | "web-design" | "print" | "packaging" | "other";
  tools?: string[];
  featuredMedia?: FeaturedMedia;
  projectImages?: ProjectImage[];
  description?: PortableTextBlock[];
}

export interface Member {
  _id: string;
  _type: "member";
  firstName: string;
  lastName: string;
  slug: {
    current: string;
  };
  profileImage?: SanityImage;
  school?: "University of Waterloo" | "Wilfred Laurier University";
  program?: string;
  graduatingClass?: string;
  bio?: PortableTextBlock[];
  experience?: Array<{
    positionTitle: string;
    company: string;
    dateStart: string;
    isCurrent?: boolean;
  }>;
  leadership?: Array<{
    positionTitle: string;
    org: string;
    dateStart: string;
    isCurrent?: boolean;
  }>;
  work?: Array<{
    _ref: string;
    _type: "reference";
  }>;
}
