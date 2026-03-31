import Button from "@/components/Button";
import { ViewModeToggleProps } from "../types";
import styles from "./ViewModeToggle.module.css";

/**
 * ViewModeToggle component - Toggle between grid and table views
 *
 * @example
 * ```tsx
 * <ViewModeToggle
 *   mode={viewMode}
 *   onChange={setViewMode}
 *   variant="desktop"
 * />
 * ```
 */
export default function ViewModeToggle({
  mode,
  onChange,
  variant = "desktop",
}: ViewModeToggleProps) {
  const className = variant === "mobile" ? styles.toggleMobile : styles.toggleDesktop;

  return (
    <div className={className}>
      <span data-cursor="button" data-cursor-label="Grid view">
        <Button
          onClick={() => onChange("grid")}
          variant="icon"
          icon="/Grid.svg"
          iconAlt="Grid view"
          active={mode === "grid"}
        />
      </span>
      <span data-cursor="button" data-cursor-label="List view">
        <Button
          onClick={() => onChange("table")}
          variant="icon"
          icon="/List.svg"
          iconAlt="Table view"
          active={mode === "table"}
        />
      </span>
    </div>
  );
}
