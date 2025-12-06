import { useState } from "react";
import { TableViewProps } from "../types";
import SortableHeader from "./SortableHeader";
import styles from "./TableView.module.css";

/**
 * TableView component - Renders items in a sortable table layout
 *
 * Features:
 * - 12-column grid layout
 * - Sortable column headers
 * - Optional hover image previews
 * - Row click handling
 *
 * @example
 * ```tsx
 * <TableView
 *   items={members}
 *   columns={columnConfig}
 *   renderRow={(member) => <MemberRow member={member} />}
 *   getItemKey={(member) => member._id}
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
  onSort,
  sortField,
  sortDirection = "asc",
  onItemClick,
  renderRow,
  renderHoverPreview,
}: TableViewProps<T>) {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

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
            align={column.align}
          />
        ))}
      </div>

      {/* Table Rows */}
      {items.map((item, index) => {
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
            {renderRow(item, index)}

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
