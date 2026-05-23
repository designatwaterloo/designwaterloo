import { createClient } from "@/lib/supabase/server";
import { TEST_ACCOUNT_EMAIL_SUFFIX } from "@/lib/supabase/test-accounts";
import type { Work, Member, WorkWithAuthor } from "@/types/database";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WorkCard from "./WorkCard";
import styles from "./page.module.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Work | Design Waterloo",
  openGraph: {
    title: "Work | Design Waterloo",
    images: [{ url: "/ogimage.png", width: 1200, height: 630 }],
  },
  twitter: {
    title: "Work | Design Waterloo",
    images: ["/ogimage.png"],
  },
};

export const revalidate = 30;

export default async function WorkPage() {
  const supabase = await createClient();

  // Pull approved works + the authoring member in a single query. RLS
  // already gates `works` to approved-for-public; we filter test accounts
  // here the same way the directory does.
  const { data } = await supabase
    .from("works")
    .select(
      `
      *,
      author:members!inner (
        id,
        slug,
        first_name,
        last_name,
        profile_image_url,
        school_email
      )
      `,
    )
    .eq("review_status", "approved")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  type Row = Work & {
    author: Pick<Member, "id" | "slug" | "first_name" | "last_name" | "profile_image_url"> & {
      school_email: string;
    };
  };

  const works: WorkWithAuthor[] = ((data as Row[] | null) ?? [])
    .filter((w) => !w.author.school_email.endsWith(TEST_ACCOUNT_EMAIL_SUFFIX))
    .map((w) => {
      const { school_email, ...author } = w.author;
      void school_email; // pulled only so it's stripped from the public shape
      return { ...w, author };
    });

  return (
    <div className="w-full">
      <Header />
      <main className="w-full">
        <section className={styles.section}>
          <div className={styles.headerRow}>
            <h1>
              Work<sup>{works.length}</sup>
            </h1>
            <p className={styles.subhead}>
              Selected work from the Design Waterloo community.
            </p>
          </div>

          {works.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No work posted yet.</p>
              <p className={styles.emptyHint}>
                Be the first — head to your dashboard to share a piece.
              </p>
            </div>
          ) : (
            <div className={styles.masonry}>
              {works.map((work) => (
                <WorkCard key={work.id} work={work} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
