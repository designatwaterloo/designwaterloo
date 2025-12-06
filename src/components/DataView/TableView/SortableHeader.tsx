import { SortableHeaderProps } from "../types";
import styles from "./TableView.module.css";

/**
 * SortableHeader - Clickable table column header with sort indicator
 */
export default function SortableHeader({
  label,
  field,
  active,
  direction,
  onClick,
  span,
  align = "left",
}: SortableHeaderProps) {
  const className = `${styles.headerColumn} ${styles[`span${span}`]} ${styles[`align${align.charAt(0).toUpperCase() + align.slice(1)}`]}`;

  return (
    <div
      className={className}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      {label} {active && (direction === "asc" ? "↑" : "↓")}
    </div>
  );
}
