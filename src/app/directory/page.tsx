import { client } from "@/sanity/lib/client";
import { Member } from "@/sanity/types";
import { membersQuery } from "@/sanity/queries";
import DirectoryClient from "./DirectoryClient";

const options = { next: { revalidate: 30 } };

export default async function DirectoryPage() {
  const members = await client.fetch<Member[]>(membersQuery, {}, options);

  return <DirectoryClient members={members} />;
}
