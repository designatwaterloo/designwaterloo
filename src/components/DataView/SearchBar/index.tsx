import { SearchBarProps } from "../types";
import styles from "./SearchBar.module.css";

/**
 * SearchBar component - Text input for filtering items
 *
 * @example
 * ```tsx
 * <SearchBar
 *   value={searchTerm}
 *   onChange={setSearchTerm}
 *   placeholder="Search by name, program, or specialty..."
 * />
 * ```
 */
export default function SearchBar({
  value,
  onChange,
  placeholder,
  className,
}: SearchBarProps) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${styles.searchInput} ${className || ""}`}
    />
  );
}
