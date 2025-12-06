import { client } from "@/sanity/lib/client";
import { projectsQuery } from "@/sanity/queries";
import type { Project } from "@/sanity/types";
import type { Metadata } from "next";
import WorkClient from "./WorkClient";

export const metadata: Metadata = {
  title: "Work | Design Waterloo",
  openGraph: {
    title: "Work | Design Waterloo",
    images: [{ url: '/ogimage.png', width: 1200, height: 630 }],
  },
  twitter: {
    title: "Work | Design Waterloo",
    images: ['/ogimage.png'],
  },
};

export default async function WorkPage() {
  const projects: Project[] = await client.fetch(projectsQuery);

  return <WorkClient projects={projects} />;
}
