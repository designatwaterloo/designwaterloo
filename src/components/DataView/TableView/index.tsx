import { useState } from "react";
import { TableViewProps } from "../types";
import SortableHeader from "./SortableHeader";
import Link from "@/components/Link";
import styles from "./TableView.module.css";

export default function TableView<T>({
  items, columns, getItemKey, getItemHref, onSort, sortField,
  sortDirection = "asc", onItemClick, renderHoverPreview,
}: TableViewProps<T>) {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  return (
    <table className={styles.tableView}>
      <caption className="sr-only">Directory members</caption>
      <thead>
        <tr className={styles.tableHeader}>
          {columns.map(column => <SortableHeader key={column.key}
            label={column.label} field={column.key} active={sortField === column.key}
            direction={sortDirection} sortable={!!column.sortable && !!onSort}
            onClick={() => onSort?.(column.key)} span={column.span}
            mobileSpan={column.mobileSpan} hideOnMobile={column.hideOnMobile} align={column.align} />)}
        </tr>
      </thead>
      <tbody>
        {items.map(item => {
          const id = getItemKey(item);
          const isHovered = hoveredItemId === id;
          return <tr key={id} className={`${styles.tableRow} ${isHovered ? styles.rowOuterHovered : ""}`}
            onMouseEnter={() => setHoveredItemId(id)} onMouseLeave={() => setHoveredItemId(null)}
            onFocus={() => setHoveredItemId(id)} onBlur={() => setHoveredItemId(null)}>
            {columns.map((column, index) => <td key={column.key}
              className={`${styles[`span${column.span}`]} ${column.mobileSpan ? styles[`mobileSpan${column.mobileSpan}`] : ""} ${column.hideOnMobile ? styles.hideOnMobile : ""} ${styles[`align${(column.align || "left").replace(/^./, c => c.toUpperCase())}`]} ${column.className || ""}`}
              data-column={column.key}>
              {index === 0 ? <>
                <Link href={getItemHref(item)} className={styles.profileLink} underline={false}
                  onClick={() => onItemClick?.(item)}>{column.render(item)}</Link>
                {renderHoverPreview && <div aria-hidden="true" className={`${styles.hoverPreview} ${isHovered ? styles.hoverPreviewVisible : ""}`}>
                  {renderHoverPreview(item)}
                </div>}
              </> : column.render(item)}
            </td>)}
          </tr>;
        })}
      </tbody>
    </table>
  );
}
