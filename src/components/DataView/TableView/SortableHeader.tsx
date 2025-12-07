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
  mobileSpan,
  hideOnMobile,
  align = "left",
}: SortableHeaderProps) {
  const alignClass = styles[`align${align.charAt(0).toUpperCase() + align.slice(1)}`];
  const spanClass = styles[`span${span}`];
  const mobileSpanClass = mobileSpan ? styles[`mobileSpan${mobileSpan}`] : "";
  const hideClass = hideOnMobile ? styles.hideOnMobile : "";

  return (
    <div
      className={`${styles.headerColumn} ${spanClass} ${mobileSpanClass} ${hideClass} ${alignClass}`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
      data-column={field}
    >
      {label} {active && (direction === "asc" ? "↑" : "↓")}
    </div>
  );
}

