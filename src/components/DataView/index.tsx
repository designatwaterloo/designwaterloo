"use client";

import { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { DataViewProps, GridColumnsConfig } from "./types";
import GridView from "./GridView";
import TableView from "./TableView";
import FilterPanel from "./FilterPanel";
import SearchBar from "./SearchBar";
import ViewModeToggle from "./ViewModeToggle";
import Button from "@/components/Button";
import styles from "./DataView.module.css";

const BREAKPOINTS = [0, 500, 800, 1100, 1400];
const DEFAULT_COLS = [2, 3, 4, 5, 6];

function getColCountForWidth(width: number, gridColumns?: GridColumnsConfig): number {
  if (gridColumns) {
    const sortedBps = Object.keys(gridColumns)
      .map(Number)
      .sort((a, b) => a - b);
    let result = gridColumns[sortedBps[0]] ?? 1;
    for (const bp of sortedBps) {
      if (width >= bp) result = gridColumns[bp];
    }
    return result;
  }
  let result = DEFAULT_COLS[0];
  for (let i = 0; i < BREAKPOINTS.length; i++) {
    if (width >= BREAKPOINTS[i]) result = DEFAULT_COLS[i];
  }
  return result;
}

/**
 * DataView - Generic data view component with grid/table layouts and filtering
 *
 * Features:
 * - Grid and table view modes
 * - Search functionality
 * - Multi-select filtering
 * - Sortable columns
 * - localStorage persistence for view mode and filters (when storageKey provided)
 * - Responsive design with mobile/desktop variants
 *
 * @example
 * ```tsx
 * <DataView<Member>
 *   items={members}
 *   getItemKey={(m) => m._id}
 *   renderGridItem={(m) => <MemberCard member={m} />}
 *   renderTableRow={(m) => <MemberRow member={m} />}
 *   columns={columnConfig}
 *   searchConfig={searchConfig}
 *   filterConfig={filterConfig}
 *   sortConfig={sortConfig}
 *   storageKey="directoryViewMode"
 * />
 * ```
 */
export default function DataView<T>({
  items,
  getItemKey,
  renderGridItem,
  columns,
  getItemHref,
  renderHoverPreview,
  searchConfig,
  filterConfig = [],
  sortConfig,
  viewModeConfig = { defaultMode: "grid", showToggle: true },
  gridAspectRatio,
  gridClassName,
  gridColumns,
  onItemClick,
  storageKey,
  initialFilters,
  onFiltersChange,
}: DataViewProps<T>) {
  const [preferencesReady, setPreferencesReady] = useState(false);

  // View mode state
  const [viewMode, setViewMode] = useState<"grid" | "table">(viewModeConfig.defaultMode);
  const [isDesktop, setIsDesktop] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isFilterPanelVisible, setIsFilterPanelVisible] = useState(() => !!initialFilters && Object.values(initialFilters).some(values => values.length > 0));

  const mainContentRef = useRef<HTMLDivElement>(null);
  const overrideTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Search and filter state
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(initialFilters ?? {});

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current);
  }, []);

  // Debounce search input
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setSearchTerm(value), 300);
  }, []);

  // Sort state
  const [sortField, setSortField] = useState<string>(sortConfig?.defaultField || "");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    sortConfig?.defaultDirection || "asc"
  );

  // Detect desktop/mobile before painting the restored filter layout.
  useLayoutEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 769);
    };

    checkDesktop();
    window.addEventListener("resize", checkDesktop);

    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Restore browser preferences before the hydration commit paints.
  useLayoutEffect(() => {
    const hasInitialFilters = initialFilters && Object.values(initialFilters).some((v) => v.length > 0);

    // Always restore saved view mode
    if (storageKey && typeof window !== "undefined") {
      try {
        const savedView = localStorage.getItem(storageKey);
        if (savedView === "grid" || savedView === "table") {
          setViewMode(savedView);
        }
      } catch { /* Storage may be unavailable. */ }
    }

    if (hasInitialFilters) {
      setSelectedFilters(initialFilters);
      setIsFilterPanelVisible(true);
    } else if (storageKey && typeof window !== "undefined") {
      try {
        const savedFilters = localStorage.getItem(`${storageKey}.filters`);
        if (savedFilters) {
          const parsed = JSON.parse(savedFilters) as {
            searchTerm?: string;
            selectedFilters?: Record<string, string[]>;
            filterPanelOpen?: boolean;
          };
          if (typeof parsed.searchTerm === "string") {
            setSearchTerm(parsed.searchTerm);
            setSearchInput(parsed.searchTerm);
          }
          if (parsed.selectedFilters && !Array.isArray(parsed.selectedFilters) &&
              Object.values(parsed.selectedFilters).every(values => Array.isArray(values) && values.every(value => typeof value === "string"))) {
            setSelectedFilters(parsed.selectedFilters);
          }
          if (parsed.filterPanelOpen === true) {
            setIsFilterPanelVisible(true);
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
    setPreferencesReady(true);
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save view mode to localStorage
  const handleViewModeChange = (mode: "grid" | "table") => {
    setViewMode(mode);
    try { if (storageKey) localStorage.setItem(storageKey, mode); } catch { /* Optional persistence. */ }
  };

  // Persist filters and filter panel state to localStorage when they change
  useEffect(() => {
    if (!preferencesReady) return;
    try {
      if (storageKey && typeof window !== "undefined") {
        const hasFilters =
          searchTerm !== "" ||
          Object.values(selectedFilters).some((vals) => vals.length > 0);
        const filterPanelOpen = isFilterPanelVisible || isMobileFilterOpen;
        if (hasFilters || filterPanelOpen) {
          localStorage.setItem(
            `${storageKey}.filters`,
            JSON.stringify({
              searchTerm,
              selectedFilters,
              filterPanelOpen,
            })
          );
        } else {
          localStorage.removeItem(`${storageKey}.filters`);
        }
      }
    } catch { /* Optional persistence. */ }
  }, [preferencesReady, storageKey, searchTerm, selectedFilters, isFilterPanelVisible, isMobileFilterOpen]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Apply search filter
      if (searchTerm && searchConfig) {
        if (!searchConfig.searchFn(item, searchTerm)) {
          return false;
        }
      }

      // Apply all filters (AND logic)
      for (const filter of filterConfig) {
        const selected = selectedFilters[filter.key] || [];
        if (selected.length > 0) {
          if (!filter.filterFn(item, selected)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [items, searchTerm, selectedFilters, searchConfig, filterConfig]);

  // Sort items
  const sortedItems = useMemo(() => {
    if (!sortField) {
      return filteredItems;
    }

    // Try to get sort function from sortConfig.fields first, then fall back to columns
    let sortFn: ((a: T, b: T) => number) | undefined;
    
    if (sortConfig?.fields?.[sortField]) {
      sortFn = sortConfig.fields[sortField];
    } else {
      // Derive from columns
      const column = columns.find((c) => c.key === sortField);
      sortFn = column?.sortFn;
    }

    if (!sortFn) {
      return filteredItems;
    }

    const sorted = [...filteredItems].sort(sortFn);
    return sortDirection === "desc" ? sorted.reverse() : sorted;
  }, [filteredItems, sortField, sortDirection, sortConfig, columns]);

  // Handle sort - cycles through: asc → desc → none (default)
  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        // First click was asc, second click goes to desc
        setSortDirection("desc");
      } else {
        // Third click: clear sort, return to default
        setSortField("");
        setSortDirection("asc");
      }
    } else {
      // New field: start with asc
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Notify parent of filter changes (skip the initial mount)
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (preferencesReady) onFiltersChange?.(selectedFilters);
  }, [selectedFilters, preferencesReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle filter change
  const handleFilterChange = (filterKey: string, values: string[]) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [filterKey]: values,
    }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setSelectedFilters({});
  };

  // Lock grid columns during filter panel animation to prevent jarring reflow
  const handleFilterToggle = useCallback(() => {
    const el = mainContentRef.current;
    if (el && isDesktop && viewMode === "grid") {
      const currentWidth = el.offsetWidth;
      // Filter panel is 280px + --margin (32px on desktop)
      const delta = 280 + 32;
      const targetWidth = isFilterPanelVisible
        ? currentWidth + delta  // closing: content grows
        : currentWidth - delta; // opening: content shrinks

      const targetCols = getColCountForWidth(Math.max(0, targetWidth), gridColumns);
      el.style.setProperty("--grid-cols-override", String(targetCols));

      // Clear any existing timer
      if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current);

      // Remove override after animation completes
      overrideTimerRef.current = setTimeout(() => {
        el.style.removeProperty("--grid-cols-override");
        overrideTimerRef.current = null;
      }, 450);
    }

    setIsFilterPanelVisible((prev) => !prev);
  }, [isDesktop, isFilterPanelVisible, viewMode, gridColumns]);

  const hasActiveFilters =
    searchTerm !== "" || Object.values(selectedFilters).some((vals) => vals.length > 0);

  return (
    <div className="w-full">
      {/* Mobile Filter Panel */}
      {filterConfig.length > 0 && (
        <FilterPanel
          filters={filterConfig}
          selectedFilters={selectedFilters}
          onFilterChange={handleFilterChange}
          onClearAll={clearAllFilters}
          items={items}
          searchTerm={searchTerm}
          searchConfig={searchConfig}
          variant="mobile"
          isOpen={isMobileFilterOpen}
          onClose={() => setIsMobileFilterOpen(false)}
        />
      )}

      {/* Main Layout */}
      <div className={styles.container}>
        {/* Desktop Filter Panel */}
        {isDesktop && filterConfig.length > 0 && (
          <div className={`${styles.filterPanelWrapper} ${isFilterPanelVisible ? styles.filterPanelWrapperOpen : ""}`}>
            <FilterPanel
              filters={filterConfig}
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
              onClearAll={clearAllFilters}
              items={items}
              searchTerm={searchTerm}
              searchConfig={searchConfig}
              variant="desktop"
              isOpen={isFilterPanelVisible}
            />
          </div>
        )}

        {/* Main Content */}
        <div ref={mainContentRef} className={styles.mainContent}>
          {/* Search Section */}
          <div className={styles.searchSection}>
            {searchConfig && (
              <SearchBar
                value={searchInput}
                onChange={handleSearchChange}
                placeholder={searchConfig.placeholder}
              />
            )}
            {filterConfig.length > 0 && (
              <div className={styles.filterButtonWrapper}>
                <Button
                  onClick={() => {
                    if (isDesktop) {
                      handleFilterToggle();
                    } else {
                      setIsMobileFilterOpen(!isMobileFilterOpen);
                    }
                  }}
                  variant="small"
                  icon="/filter.svg"
                >
                  Filters{" "}
                  {Object.values(selectedFilters).reduce(
                    (sum, vals) => sum + vals.length,
                    0
                  ) > 0 &&
                    `(${Object.values(selectedFilters).reduce((sum, vals) => sum + vals.length, 0)})`}
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Controls */}
          <div className={styles.mobileControls}>
            {filterConfig.length > 0 && (
              <Button
                onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                variant="small"
                icon="/filter.svg"
              >
                Filters{" "}
                {Object.values(selectedFilters).reduce(
                  (sum, vals) => sum + vals.length,
                  0
                ) > 0 &&
                  `(${Object.values(selectedFilters).reduce((sum, vals) => sum + vals.length, 0)})`}
              </Button>
            )}
            <div className={styles.mobileRightControls}>
              {hasActiveFilters && (
                <div className={styles.resultsCount}>
                  {filteredItems.length}/{items.length}
                </div>
              )}
              {viewModeConfig.showToggle && (
                <ViewModeToggle
                  mode={viewMode}
                  onChange={handleViewModeChange}
                  variant="mobile"
                />
              )}
            </div>
          </div>

          {/* Active filter pills + view toggle */}
          {(hasActiveFilters || viewModeConfig.showToggle) && isDesktop && (
            <div className={styles.desktopControls}>
              {hasActiveFilters && (
                <div className={styles.activeFilters}>
                  {Object.entries(selectedFilters).flatMap(([filterKey, values]) => {
                    const cfg = filterConfig.find((f) => f.key === filterKey);
                    return values.map((val) => {
                      const display = cfg?.formatValue ? cfg.formatValue(val) : val;
                      return (
                        <button
                          key={`${filterKey}-${val}`}
                          className={styles.activeFilterPill}
                          onClick={() => handleFilterChange(filterKey, values.filter((v) => v !== val))}
                        >
                          {display}
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                            <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      );
                    });
                  })}
                </div>
              )}
              {viewModeConfig.showToggle && (
                <ViewModeToggle
                  mode={viewMode}
                  onChange={handleViewModeChange}
                  variant="desktop"
                />
              )}
            </div>
          )}

          {/* Grid or Table View */}
          {viewMode === "grid" ? (
            <GridView
              items={sortedItems}
              renderItem={renderGridItem}
              getItemKey={getItemKey}
              aspectRatio={gridAspectRatio}
              className={gridClassName}
              onItemClick={onItemClick}
              gridColumns={gridColumns}
            />
          ) : (
            <TableView
              items={sortedItems}
              columns={columns}
              getItemKey={getItemKey}
              getItemHref={getItemHref}
              onSort={handleSort}
              sortField={sortField}
              sortDirection={sortDirection}
              onItemClick={onItemClick}
              renderHoverPreview={renderHoverPreview}
            />
          )}
        </div>
      </div>
    </div>
  );
}
