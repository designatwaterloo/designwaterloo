import Header from "@/components/Header";
import Footer from "@/components/Footer";

import { client } from "@/sanity/lib/client";
import { Member } from "@/sanity/types";
import Link from "@/components/Link";
import { membersQuery } from "@/sanity/queries";

const options = { next: { revalidate: 30 } };

export default async function DirectoryPage() {
  const members = await client.fetch<Member[]>(membersQuery, {}, options);

  return (
    <div className="w-full">
      <Header />

      {/* Main Content */}
      <main className="w-full">
        <section className="w-full px-[var(--margin)] py-12 flex flex-col gap-12">
          <h1>Directory</h1>
          <ul className="list-none p-0 m-0 flex flex-col gap-4">
            {members.map((member) => (
              <li key={member._id} className="text-2xl">
                <Link href={`/directory/${member.slug.current}`}>
                  {member.firstName} {member.lastName}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
}
