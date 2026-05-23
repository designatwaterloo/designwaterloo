import Image from "next/image";
import Link from "@/components/Link";
import type { WorkWithAuthor } from "@/types/database";
import styles from "./WorkCard.module.css";

interface WorkCardProps {
  work: WorkWithAuthor;
}

export default function WorkCard({ work }: WorkCardProps) {
  // Fallback aspect ratio if none was stored at upload time — square reads
  // better than a layout shift mid-load.
  const ratio = work.cover_aspect_ratio && work.cover_aspect_ratio > 0
    ? work.cover_aspect_ratio
    : 1;

  return (
    <Link
      href={`/work/${work.slug}`}
      className={styles.card}
      underline={false}
      data-cursor="grid-item"
      data-cursor-label={work.title}
    >
      <div
        className={styles.media}
        style={{ aspectRatio: String(ratio) }}
      >
        {work.cover_image_url ? (
          <Image
            src={work.cover_image_url}
            alt={work.title}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 33vw"
            className={styles.image}
          />
        ) : (
          <div className={styles.placeholder} aria-hidden="true" />
        )}
      </div>
      <div className={styles.meta}>
        <span className={styles.title}>{work.title}</span>
        <span className={styles.author}>
          {work.author.first_name} {work.author.last_name}
          {work.year ? ` · ${work.year}` : ""}
        </span>
      </div>
    </Link>
  );
}
