import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "@/components/Link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Work, Member, WorkImage } from "@/types/database";
import type { Metadata } from "next";
import styles from "./page.module.css";

export const revalidate = 30;

interface PageProps {
  params: Promise<{ slug: string }>;
}

type WorkRow = Work & {
  author: Pick<
    Member,
    "id" | "slug" | "first_name" | "last_name" | "profile_image_url" | "program" | "graduating_class"
  >;
};

async function fetchWork(slug: string): Promise<WorkRow | null> {
  const supabase = await createClient();
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
        program,
        graduating_class
      )
      `,
    )
    .eq("slug", slug)
    .eq("review_status", "approved")
    .maybeSingle();

  return (data as WorkRow | null) ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const work = await fetchWork(slug);
  if (!work) return { title: "Work | Design Waterloo" };
  const title = `${work.title} | Design Waterloo`;
  const ogImage = work.cover_image_url ?? "/ogimage.png";
  return {
    title,
    openGraph: {
      title,
      description: work.description ?? undefined,
      images: [{ url: ogImage }],
    },
    twitter: { title, images: [ogImage] },
  };
}

export default async function WorkDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const work = await fetchWork(slug);
  if (!work) notFound();

  const images: WorkImage[] = work.images ?? [];

  return (
    <div className="w-full">
      <Header />
      <main className="w-full">
        <article className={styles.article}>
          <header className={styles.header}>
            <h1 className={styles.title}>{work.title}</h1>
            <div className={styles.metaRow}>
              <Link href={`/directory/${work.author.slug}`} className={styles.authorLink}>
                {work.author.first_name} {work.author.last_name}
              </Link>
              {work.year && <span className={styles.metaItem}>{work.year}</span>}
              {work.external_url && (
                <a
                  href={work.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.metaItem}
                >
                  View live ↗
                </a>
              )}
            </div>
            {work.description && (
              <p className={styles.description}>{work.description}</p>
            )}
          </header>

          {work.cover_image_url && (
            <figure
              className={styles.figure}
              style={{ aspectRatio: String(work.cover_aspect_ratio || 1) }}
            >
              <Image
                src={work.cover_image_url}
                alt={work.title}
                fill
                priority
                sizes="(max-width: 1100px) 100vw, 1024px"
                className={styles.image}
              />
            </figure>
          )}

          {images.length > 0 && (
            <div className={styles.gallery}>
              {images.map((img, i) => (
                <figure
                  key={i}
                  className={styles.figure}
                  style={{ aspectRatio: String(img.aspectRatio || 1) }}
                >
                  <Image
                    src={img.url}
                    alt={img.alt ?? `${work.title} — image ${i + 1}`}
                    fill
                    sizes="(max-width: 1100px) 100vw, 1024px"
                    className={styles.image}
                  />
                </figure>
              ))}
            </div>
          )}
        </article>
      </main>
      <Footer />
    </div>
  );
}
