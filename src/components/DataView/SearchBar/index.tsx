import { useId } from "react";
import { SearchBarProps } from "../types";
import styles from "./SearchBar.module.css";

export default function SearchBar({
  value,
  onChange,
  placeholder,
  className,
}: SearchBarProps) {
  const id = useId();
  return (
    <div className={`${styles.searchWrapper} ${className || ""}`}>
      <svg
        className={styles.searchIcon}
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <label className="sr-only" htmlFor={id}>Search directory</label>
      <input id={id}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.searchInput}
      />
    </div>
  );
}
