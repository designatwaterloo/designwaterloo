import Link from "@/components/Link";
import { Project } from "@/sanity/types";
import styles from "./page.module.css";

interface ProjectTableRowProps {
  project: Project;
  onClick?: () => void;
}

/**
 * ProjectTableRow - Table row component for displaying a project
 *
 * Displays project title, client, category, and year in table columns
 */
export default function ProjectTableRow({ project, onClick }: ProjectTableRowProps) {
  return (
    <Link
      href={`/work/${project.slug.current}`}
      className={styles.tableRow}
      underline={false}
      onClick={onClick}
    >
      <div className={styles.titleColumn}>{project.title}</div>
      <div className={styles.clientColumn}>{project.client}</div>
      <div className={styles.categoryColumn}>{project.category || "—"}</div>
      <div className={styles.yearColumn}>{project.yearCompleted}</div>
    </Link>
  );
}
