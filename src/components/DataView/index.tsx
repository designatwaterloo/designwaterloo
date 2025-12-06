"use client";

import { useState, useMemo, useEffect } from "react";
import { DataViewProps } from "./types";
import GridView from "./GridView";
import TableView from "./TableView";
import FilterPanel from "./FilterPanel";
import SearchBar from "./SearchBar";
import ViewModeToggle from "./ViewModeToggle";
import Button from "@/components/Button";
import styles from "./DataView.module.css";

/**
 * DataView - Generic data view component with grid/table layouts and filtering
 *
 * Features:
 * - Grid and table view modes
 * - Search functionality
 * - Multi-select filtering
 * - Sortable columns
 * - localStorage persistence for view mode
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
  renderTableRow,
  columns,
  renderHoverPreview,
  searchConfig,
  filterConfig = [],
  sortConfig,
  viewModeConfig = { defaultMode: "grid", showToggle: true },
  gridAspectRatio,
  gridClassName,
  onItemClick,
  storageKey,
}: DataViewProps<T>) {
  // View mode state
  const [viewMode, setViewMode] = useState<"grid" | "table">(viewModeConfig.defaultMode);
  const [isDesktop, setIsDesktop] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isFilterPanelVisible, setIsFilterPanelVisible] = useState(false);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});

  // Sort state
  const [sortField, setSortField] = useState<string>(sortConfig?.defaultField || "");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    sortConfig?.defaultDirection || "asc"
  );

  // Detect desktop/mobile
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth > 768);
    };

    checkDesktop();
    window.addEventListener("resize", checkDesktop);

    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Load view mode from localStorage
  useEffect(() => {
    if (storageKey) {
      const savedView = localStorage.getItem(storageKey);
      if (savedView === "grid" || savedView === "table") {
        setViewMode(savedView);
      }
    }
  }, [storageKey]);

  // Save view mode to localStorage
  const handleViewModeChange = (mode: "grid" | "table") => {
    setViewMode(mode);
    if (storageKey && typeof window !== "undefined") {
      localStorage.setItem(storageKey, mode);
    }
  };

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
    if (!sortConfig || !sortField) {
      return filteredItems;
    }

    const sortFn = sortConfig.fields[sortField];
    if (!sortFn) {
      return filteredItems;
    }

    const sorted = [...filteredItems].sort(sortFn);
    return sortDirection === "desc" ? sorted.reverse() : sorted;
  }, [filteredItems, sortField, sortDirection, sortConfig]);

  // Handle sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle filter change
  const handleFilterChange = (filterKey: string, values: string[]) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [filterKey]: values,
    }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedFilters({});
  };

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
          variant="mobile"
          isOpen={isMobileFilterOpen}
          onClose={() => setIsMobileFilterOpen(false)}
        />
      )}

      {/* Main Layout */}
      <div className={styles.container}>
        {/* Desktop Filter Panel */}
        {isDesktop && isFilterPanelVisible && filterConfig.length > 0 && (
          <FilterPanel
            filters={filterConfig}
            selectedFilters={selectedFilters}
            onFilterChange={handleFilterChange}
            onClearAll={clearAllFilters}
            items={items}
            searchTerm={searchTerm}
            variant="desktop"
          />
        )}

        {/* Main Content */}
        <div className={styles.mainContent}>
          {/* Search Section */}
          <div className={styles.searchSection}>
            {searchConfig && (
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={searchConfig.placeholder}
              />
            )}
            {filterConfig.length > 0 && (
              <div className={styles.filterButtonWrapper}>
                <Button
                  onClick={() => {
                    if (isDesktop) {
                      setIsFilterPanelVisible(!isFilterPanelVisible);
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
            {viewModeConfig.showToggle && (
              <ViewModeToggle
                mode={viewMode}
                onChange={handleViewModeChange}
                variant="mobile"
              />
            )}
            {hasActiveFilters && (
              <div className={styles.resultsCount}>
                Showing {filteredItems.length} of {items.length} items
              </div>
            )}
          </div>

          {/* Desktop View Toggle */}
          {viewModeConfig.showToggle && isDesktop && (
            <div className={styles.desktopControls}>
              <ViewModeToggle
                mode={viewMode}
                onChange={handleViewModeChange}
                variant="desktop"
              />
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
            />
          ) : (
            <TableView
              items={sortedItems}
              columns={columns}
              getItemKey={getItemKey}
              onSort={handleSort}
              sortField={sortField}
              sortDirection={sortDirection}
              onItemClick={onItemClick}
              renderRow={renderTableRow}
              renderHoverPreview={renderHoverPreview}
            />
          )}
        </div>
      </div>
    </div>
  );
}
