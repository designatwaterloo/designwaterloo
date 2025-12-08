import { ReactNode } from "react";

/**
 * Configuration for responsive grid columns
 * Keys are container widths in pixels, values are column counts
 * Use 0 as key for base (smallest) column count
 */
export interface GridColumnsConfig {
  [breakpoint: number]: number;
}

/**
 * Configuration for a single table column
 */
export interface ColumnConfig<T> {
  /** Unique key for the column */
  key: string;
  /** Column header label */
  label: string;
  /** Column span in 12-column grid */
  span: number;
  /** Column span on mobile (6-column grid), defaults to span */
  mobileSpan?: number;
  /** Hide this column on mobile */
  hideOnMobile?: boolean;
  /** Text alignment */
  align?: "left" | "center" | "right";
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Render function for cell content */
  render: (item: T) => ReactNode;
  /** Optional extra class name for cell styling */
  className?: string;
  /** Custom sort function (required if sortable is true) */
  sortFn?: (a: T, b: T) => number;
}

/**
 * Configuration for search functionality
 */
export interface SearchConfig<T> {
  /** Search input placeholder text */
  placeholder: string;
  /** Function to determine if item matches search term */
  searchFn: (item: T, searchTerm: string) => boolean;
}

/**
 * Single option in a filter
 */
export interface FilterOption {
  value: string;
  label: string;
}

/**
 * Configuration for a single filter
 */
export interface FilterConfig<T> {
  /** Unique key for the filter */
  key: string;
  /** Filter section label */
  label: string;
  /** Filter type (currently only checkbox is supported) */
  type: "checkbox";
  /** Available filter options */
  options: FilterOption[];
  /** Function to determine if item passes filter */
  filterFn: (item: T, selectedValues: string[]) => boolean;
  /** Optional function to get count of items for each option */
  getCount?: (option: string, items: T[], searchTerm: string, otherFilters: Record<string, string[]>) => number;
  /** Optional function to format value for display */
  formatValue?: (value: string) => string;
}

/**
 * Configuration for sorting functionality
 */
export interface SortConfig<T> {
  /** Default sort field key */
  defaultField: string;
  /** Default sort direction */
  defaultDirection: "asc" | "desc";
  /** Map of field keys to sort functions */
  fields: Record<string, (a: T, b: T) => number>;
}

/**
 * Configuration for view mode toggle
 */
export interface ViewModeConfig {
  /** Default view mode */
  defaultMode: "grid" | "table";
  /** Whether to show view mode toggle buttons */
  showToggle: boolean;
}

/**
 * Props for the main DataView component
 */
export interface DataViewProps<T> {
  // Data
  /** Array of items to display */
  items: T[];
  /** Function to get unique key for each item */
  getItemKey: (item: T) => string;

  // Grid rendering
  /** Render function for grid items */
  renderGridItem: (item: T, index: number) => ReactNode;
  /** Grid image aspect ratio (e.g., "4/5" or "4/3") */
  gridAspectRatio?: string;
  /** Optional className for grid container */
  gridClassName?: string;
  /** Custom grid column breakpoints (overrides default responsive columns) */
  gridColumns?: GridColumnsConfig;

  // Table rendering
  /** Table column configuration */
  columns: ColumnConfig<T>[];
  /** Function to get href for each item (for table row links) */
  getItemHref: (item: T) => string;
  /** Optional render function for hover preview in table view */
  renderHoverPreview?: (item: T) => ReactNode;

  // Features
  /** Search configuration */
  searchConfig?: SearchConfig<T>;
  /** Array of filter configurations */
  filterConfig?: FilterConfig<T>[];
  /** Sort configuration */
  sortConfig?: SortConfig<T>;
  /** View mode configuration */
  viewModeConfig?: ViewModeConfig;

  // Callbacks
  /** Callback when item is clicked */
  onItemClick?: (item: T) => void;

  // Persistence
  /** localStorage key for persisting view mode */
  storageKey?: string;
}

/**
 * Props for GridView component
 */
export interface GridViewProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  getItemKey: (item: T) => string;
  aspectRatio?: string;
  className?: string;
  onItemClick?: (item: T) => void;
  /** Custom grid column breakpoints (overrides default responsive columns) */
  gridColumns?: GridColumnsConfig;
}

/**
 * Props for TableView component
 */
export interface TableViewProps<T> {
  items: T[];
  columns: ColumnConfig<T>[];
  getItemKey: (item: T) => string;
  getItemHref: (item: T) => string;
  onSort?: (field: string) => void;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  onItemClick?: (item: T) => void;
  renderHoverPreview?: (item: T) => ReactNode;
}

/**
 * Props for SortableHeader component
 */
export interface SortableHeaderProps {
  label: string;
  field: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
  span: number;
  mobileSpan?: number;
  hideOnMobile?: boolean;
  align?: "left" | "center" | "right";
}

/**
 * Props for FilterPanel component
 */
export interface FilterPanelProps<T> {
  filters: FilterConfig<T>[];
  selectedFilters: Record<string, string[]>;
  onFilterChange: (filterKey: string, values: string[]) => void;
  onClearAll: () => void;
  items: T[];
  searchTerm: string;
  searchConfig?: SearchConfig<T>;
  variant: "desktop" | "mobile";
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * Props for SearchBar component
 */
export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

/**
 * Props for ViewModeToggle component
 */
export interface ViewModeToggleProps {
  mode: "grid" | "table";
  onChange: (mode: "grid" | "table") => void;
  variant?: "desktop" | "mobile";
}
