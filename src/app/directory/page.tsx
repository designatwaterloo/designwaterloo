import { client } from "@/sanity/lib/client";
import { Member } from "@/sanity/types";
import { membersQuery } from "@/sanity/queries";
import DirectoryClient from "./DirectoryClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Directory | Design Waterloo",
  openGraph: {
    title: "Directory | Design Waterloo",
  },
  twitter: {
    title: "Directory | Design Waterloo",
  },
};

const options = { next: { revalidate: 30 } };

export default async function DirectoryPage() {
  const members = await client.fetch<Member[]>(membersQuery, {}, options);

  return <DirectoryClient members={members} />;
}
