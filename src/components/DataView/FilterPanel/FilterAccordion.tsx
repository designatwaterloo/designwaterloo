import { useState } from "react";
import { FilterConfig } from "../types";
import styles from "./FilterPanel.module.css";

interface FilterAccordionProps<T> {
  filter: FilterConfig<T>;
  selectedValues: string[];
  onFilterChange: (values: string[]) => void;
  getCount: (option: string) => number;
}

/**
 * FilterAccordion - Single filter section with accordion UI
 */
export default function FilterAccordion<T>({
  filter,
  selectedValues,
  onFilterChange,
  getCount,
}: FilterAccordionProps<T>) {
  const [isOpen, setIsOpen] = useState(selectedValues.length > 0);

  const toggleFilter = (value: string) => {
    if (selectedValues.includes(value)) {
      onFilterChange(selectedValues.filter((v) => v !== value));
    } else {
      onFilterChange([...selectedValues, value]);
    }
  };

  const clearFilter = () => {
    onFilterChange([]);
  };

  return (
    <div className={styles.filterAccordion}>
      <button
        className={styles.accordionHeader}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.accordionTitle}>
          {filter.label}
          {selectedValues.length > 0 && ` (${selectedValues.length})`}
        </span>
        <svg
          className={`${styles.accordionArrow} ${isOpen ? styles.accordionArrowOpen : ""}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20.031 9.53068L12.531 17.0307C12.4614 17.1004 12.3787 17.1557 12.2876 17.1935C12.1966 17.2312 12.099 17.2506 12.0004 17.2506C11.9019 17.2506 11.8043 17.2312 11.7132 17.1935C11.6222 17.1557 11.5394 17.1004 11.4698 17.0307L3.96979 9.53068C3.82906 9.38995 3.75 9.19907 3.75 9.00005C3.75 8.80103 3.82906 8.61016 3.96979 8.46943C4.11052 8.32869 4.30139 8.24963 4.50042 8.24963C4.69944 8.24963 4.89031 8.32869 5.03104 8.46943L12.0004 15.4397L18.9698 8.46943C19.0395 8.39974 19.1222 8.34447 19.2132 8.30676C19.3043 8.26904 19.4019 8.24963 19.5004 8.24963C19.599 8.24963 19.6965 8.26904 19.7876 8.30676C19.8786 8.34447 19.9614 8.39974 20.031 8.46943C20.1007 8.53911 20.156 8.62183 20.1937 8.71288C20.2314 8.80392 20.2508 8.9015 20.2508 9.00005C20.2508 9.0986 20.2314 9.19618 20.1937 9.28722C20.156 9.37827 20.1007 9.46099 20.031 9.53068Z"
            fill="currentColor"
          />
        </svg>
      </button>
      {isOpen && (
        <div className={styles.accordionContent}>
          {selectedValues.length > 0 && (
            <button onClick={clearFilter} className={styles.clearButton}>
              Clear
            </button>
          )}
          <div className={styles.options}>
            {filter.options.map((option) => {
              const count = getCount(option.value);
              const displayValue = filter.formatValue
                ? filter.formatValue(option.value)
                : option.label;

              return (
                <label key={option.value} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option.value)}
                    onChange={() => toggleFilter(option.value)}
                    className={styles.checkbox}
                  />
                  <span>{displayValue}</span>
                  <span className={styles.count}>({count})</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
