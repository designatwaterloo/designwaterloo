import { GridViewProps } from "../types";
import styles from "./GridView.module.css";

/**
 * GridView component - Renders items in a responsive grid layout
 *
 * Default column counts (container queries):
 * - 2 columns at base
 * - 3 columns at 500px+
 * - 4 columns at 800px+
 * - 5 columns at 1100px+
 * - 6 columns at 1400px+
 *
 * Custom columns can be provided via gridColumns prop:
 * { 0: 1, 500: 2, 1100: 3 } = 1 col base, 2 at 500px+, 3 at 1100px+
 *
 * @example
 * ```tsx
 * <GridView
 *   items={members}
 *   renderItem={(member) => <MemberCard member={member} />}
 *   getItemKey={(member) => member._id}
 *   aspectRatio="4/5"
 *   gridColumns={{ 0: 1, 500: 2, 1100: 3 }}
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
  gridColumns,
}: GridViewProps<T>) {
  // Build CSS custom properties for custom grid columns
  const gridStyle: Record<string, string | number> = {};

  if (aspectRatio) {
    gridStyle["--aspect-ratio"] = aspectRatio;
  }

  if (gridColumns) {
    // Get breakpoints in order and fill in values
    // Higher breakpoints inherit from the nearest lower breakpoint if not set
    const breakpoints = [0, 500, 800, 1100, 1400] as const;
    const varNames = [
      "--grid-cols-base",
      "--grid-cols-500", 
      "--grid-cols-800",
      "--grid-cols-1100",
      "--grid-cols-1400",
    ];
    
    let lastValue = 1; // default
    for (let i = 0; i < breakpoints.length; i++) {
      const bp = breakpoints[i];
      if (gridColumns[bp] !== undefined) {
        lastValue = gridColumns[bp];
      }
      gridStyle[varNames[i]] = lastValue;
    }
  }

  const gridClass = gridColumns
    ? `${styles.gridCustom} ${className || ""}`
    : `${styles.grid} ${className || ""}`;

  return (
    <div className={gridClass} style={gridStyle}>
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

