import Header from "@/components/Header";
import Footer from "@/components/Footer";

import { client } from "@/sanity/lib/client";
import { Member } from "@/sanity/types";
import Link from "@/components/Link";

const MEMBERS_QUERY = `*[_type == "member" &&  defined(slug.current)] | order(firstName asc) {
  _id,
  firstName,
  lastName,
  slug,
  profileImage,
  bio,
  school,
  program,
  graduatingClass
}`;

const options = { next: { revalidate: 30 } };

export default async function DirectoryPage() {
  const members = await client.fetch<Member[]>(MEMBERS_QUERY, {}, options);

  return (
    <div className="w-full">
      <Header />

      {/* Main Content */}
      <main className="w-full">
        <section className="w-full px-[var(--margin)] py-12 flex flex-col gap-12">
          <h1>Directory</h1>
          <ul>
            {members.map((member) => (
              <li key={member._id}>
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
