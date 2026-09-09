import { SortableHeaderProps } from "../types";
import styles from "./TableView.module.css";

/**
 * SortableHeader - Clickable table column header with sort indicator
 */
export default function SortableHeader({
  label,
  sortable,
  field,
  active,
  direction,
  onClick,
  span,
  mobileSpan,
  hideOnMobile,
  align = "left",
}: SortableHeaderProps) {
  const alignClass = styles[`align${align.charAt(0).toUpperCase() + align.slice(1)}`];
  const spanClass = styles[`span${span}`];
  const mobileSpanClass = mobileSpan ? styles[`mobileSpan${mobileSpan}`] : "";
  const hideClass = hideOnMobile ? styles.hideOnMobile : "";

  return (
    <th scope="col" aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}
      className={`${styles.headerColumn} ${spanClass} ${mobileSpanClass} ${hideClass} ${alignClass}`}
      data-column={field}
    >
      {sortable ? <button type="button" className={styles.sortButton} onClick={onClick}>
        {label} <span aria-hidden="true">{active && (direction === "asc" ? "↑" : "↓")}</span>
      </button> : label}
    </th>
  );
}

