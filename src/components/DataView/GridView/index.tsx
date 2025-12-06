import { GridViewProps } from "../types";
import styles from "./GridView.module.css";

/**
 * GridView component - Renders items in a responsive grid layout
 *
 * Uses container queries to adapt column count based on available width:
 * - 2 columns at base
 * - 3 columns at 500px+
 * - 4 columns at 800px+
 * - 5 columns at 1100px+
 * - 6 columns at 1400px+
 *
 * @example
 * ```tsx
 * <GridView
 *   items={members}
 *   renderItem={(member) => <MemberCard member={member} />}
 *   getItemKey={(member) => member._id}
 *   aspectRatio="4/5"
 * />
 * ```
 */
export default function GridView<T>({
  items,
  renderItem,
  getItemKey,
  aspectRatio,
  className,
  onItemClick,
}: GridViewProps<T>) {
  return (
    <div
      className={`${styles.grid} ${className || ""}`}
      style={aspectRatio ? { "--aspect-ratio": aspectRatio } as React.CSSProperties : undefined}
    >
      {items.map((item, index) => (
        <div
          key={getItemKey(item)}
          className={styles.gridItem}
          onClick={() => onItemClick?.(item)}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}
