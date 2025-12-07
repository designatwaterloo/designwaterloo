import { FilterPanelProps, FilterConfig } from "../types";
import FilterAccordion from "./FilterAccordion";
import styles from "./FilterPanel.module.css";

/**
 * FilterPanel component - Filter UI with desktop sidebar and mobile overlay variants
 *
 * Features:
 * - Accordion sections for each filter
 * - Count badges for each option
 * - Clear all / individual clear buttons
 * - Desktop: Sticky sidebar
 * - Mobile: Full-screen overlay panel
 *
 * @example
 * ```tsx
 * <FilterPanel
 *   filters={filterConfig}
 *   selectedFilters={selectedFilters}
 *   onFilterChange={handleFilterChange}
 *   onClearAll={clearAllFilters}
 *   items={allItems}
 *   searchTerm={searchTerm}
 *   variant="desktop"
 * />
 * ```
 */
export default function FilterPanel<T>({
  filters,
  selectedFilters,
  onFilterChange,
  onClearAll,
  items,
  searchTerm,
  searchConfig,
  variant,
  isOpen,
  onClose,
}: FilterPanelProps<T>) {
  const hasActiveFilters =
    searchTerm !== "" || Object.values(selectedFilters).some((vals) => vals.length > 0);

  const getFilterCount = (filter: FilterConfig<T>, optionValue: string) => {
    if (filter.getCount) {
      return filter.getCount(optionValue, items, searchTerm, selectedFilters);
    }

    // Default count implementation
    return items.filter((item) => {
      // Apply search filter
      const matchesSearch = !searchTerm || (
        searchConfig?.searchFn(item, searchTerm) ?? true
      );
      if (!matchesSearch) return false;

      // Apply other filters (excluding current filter)
      const otherFilters = Object.entries(selectedFilters).filter(
        ([key]) => key !== filter.key
      );
      for (const [filterKey, selectedValues] of otherFilters) {
        if (selectedValues.length > 0) {
          const filterConfig = filters.find((f) => f.key === filterKey);
          if (filterConfig && !filterConfig.filterFn(item, selectedValues)) {
            return false;
          }
        }
      }

      // Check if item matches this specific option
      return filter.filterFn(item, [optionValue]);
    }).length;
  };

  const content = (
    <>
      {hasActiveFilters && (
        <button onClick={onClearAll} className={styles.clearAllButton}>
          Clear all filters
        </button>
      )}

      {filters.map((filter) => (
        <FilterAccordion
          key={filter.key}
          filter={filter}
          selectedValues={selectedFilters[filter.key] || []}
          onFilterChange={(values) => onFilterChange(filter.key, values)}
          getCount={(option) => getFilterCount(filter, option)}
        />
      ))}
    </>
  );

  if (variant === "mobile") {
    return (
      <>
        <div className={`${styles.panelMobile} ${isOpen ? styles.panelOpen : ""}`}>
          <div className={styles.panelHeader}>
            <h2>Filters</h2>
            <button
              onClick={onClose}
              className={styles.closeButton}
              aria-label="Close filters"
            >
              ×
            </button>
          </div>
          <div className={styles.panelContent}>{content}</div>
        </div>
        {isOpen && (
          <div className={styles.panelOverlay} onClick={onClose} />
        )}
      </>
    );
  }

  // Desktop variant
  return (
    <aside className={styles.panelDesktop}>
      <div className={styles.panelSticky} data-lenis-prevent>
        {content}
      </div>
    </aside>
  );
}
