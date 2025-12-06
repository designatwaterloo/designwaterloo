import Link from "@/components/Link";
import { Member } from "@/sanity/types";
import styles from "./page.module.css";

interface MemberTableRowProps {
  member: Member;
  onClick?: () => void;
}

/**
 * MemberTableRow - Table row component for displaying a member
 *
 * Displays member name, program, and graduating class in table columns
 */
export default function MemberTableRow({ member, onClick }: MemberTableRowProps) {
  return (
    <Link
      href={`/directory/${member.slug.current}`}
      className={styles.tableRow}
      underline={false}
      onClick={onClick}
    >
      <div className={styles.nameColumn}>
        {member.firstName} {member.lastName}
      </div>
      <div className={styles.infoColumn}>
        {member.program}
      </div>
      <div className={styles.classColumn}>
        {member.graduatingClass}
      </div>
    </Link>
  );
}
