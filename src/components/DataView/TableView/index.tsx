import { useState } from "react";
import { TableViewProps } from "../types";
import SortableHeader from "./SortableHeader";
import Link from "@/components/Link";
import styles from "./TableView.module.css";

/**
 * TableView component - Renders items in a sortable table layout
 *
 * Features:
 * - 12-column grid layout with auto-generated cells from columns config
 * - Sortable column headers
 * - Optional hover image previews
 * - Row links using getItemHref
 *
 * @example
 * ```tsx
 * <TableView
 *   items={members}
 *   columns={columnConfig}
 *   getItemKey={(member) => member._id}
 *   getItemHref={(member) => `/directory/${member.slug.current}`}
 *   sortField="name"
 *   sortDirection="asc"
 *   onSort={(field) => handleSort(field)}
 * />
 * ```
 */
export default function TableView<T>({
  items,
  columns,
  getItemKey,
  getItemHref,
  onSort,
  sortField,
  sortDirection = "asc",
  onItemClick,
  renderHoverPreview,
}: TableViewProps<T>) {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // Helper to get alignment class
  const getAlignClass = (align?: "left" | "center" | "right") => {
    if (!align || align === "left") return styles.alignLeft;
    if (align === "center") return styles.alignCenter;
    return styles.alignRight;
  };

  return (
    <div className={styles.tableView}>
      {/* Table Header */}
      <div className={styles.tableHeader}>
        {columns.map((column) => (
          <SortableHeader
            key={column.key}
            label={column.label}
            field={column.key}
            active={sortField === column.key}
            direction={sortDirection}
            onClick={() => column.sortable && onSort?.(column.key)}
            span={column.span}
            mobileSpan={column.mobileSpan}
            hideOnMobile={column.hideOnMobile}
            align={column.align}
          />
        ))}
      </div>

      {/* Table Rows - Auto-generated from columns config */}
      {items.map((item) => {
        const itemId = getItemKey(item);
        const isHovered = hoveredItemId === itemId;

        return (
          <div
            key={itemId}
            className={styles.tableRowWrapper}
            onMouseEnter={() => setHoveredItemId(itemId)}
            onMouseLeave={() => setHoveredItemId(null)}
            onClick={() => onItemClick?.(item)}
          >
            <Link
              href={getItemHref(item)}
              className={styles.tableRow}
              underline={false}
            >
              {columns.map((column) => (
                <div
                  key={column.key}
                  className={`
                    ${styles[`span${column.span}`]}
                    ${column.mobileSpan ? styles[`mobileSpan${column.mobileSpan}`] : ""}
                    ${column.hideOnMobile ? styles.hideOnMobile : ""}
                    ${getAlignClass(column.align)}
                    ${column.className || ""}
                  `.trim()}
                  data-column={column.key}
                >
                  {column.render(item)}
                </div>
              ))}
            </Link>

            {/* Hover Preview */}
            {isHovered && renderHoverPreview && (
              <div className={styles.hoverPreview}>
                {renderHoverPreview(item)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
