"use client"

import * as React from "react"
import {
  createColumnHelper,
  useTable,
  type ColumnDef,
  type ColumnVisibilityState,
  type ExpandedState,
  type PaginationState,
  type SortingState,
  type Updater,
} from "@tanstack/react-table"

import { cn } from "../utils"
import { Card } from "./card"
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
  type DataGridProps,
} from "./data-grid/data-grid"
import { DataGridColumnHeader } from "./data-grid/data-grid-column-header"
import { DataGridPagination } from "./data-grid/data-grid-pagination"
import { DataGridScrollArea } from "./data-grid/data-grid-scroll-area"
import { DataGridTable } from "./data-grid/data-grid-table"
import { DataTableToolbar } from "./data-table-toolbar"
import {
  hasActiveDataTableQuery,
  type DataTableQuery,
} from "./data-table-query"
import { type FilterFieldConfig } from "./filters"

/** Keep in sync with the server-side default in `schemas/filters.ts`. */
export const DATA_TABLE_DEFAULT_PAGE_SIZE = 25
export const DATA_TABLE_PAGE_SIZES = [10, 25, 50, 100]

export function createDataTableColumnHelper<TData extends object>() {
  return createColumnHelper<DataGridFeatures, TData>()
}

export type DataTableEmptyContent = {
  title: string
  description?: string
}

export type DataTableProps<TData extends object> = {
  columns: ColumnDef<DataGridFeatures, TData>[]
  /** Current page of rows. `undefined` while loading renders the skeleton. */
  data: TData[] | undefined
  /** Total matching records on the server — drives pagination + count info. */
  total?: number
  isLoading?: boolean
  query: DataTableQuery
  onQueryChange: (query: DataTableQuery) => void
  filterFields?: FilterFieldConfig[]
  filterDisplay?: "inline" | "compact"
  searchPlaceholder?: string
  debounceMs?: number
  showSearch?: boolean
  /**
   * Pinned to the right of the toolbar (e.g. an "Add unit" button) —
   * independent of search/filters, so it stays fixed in place even as
   * filter chips wrap or grow.
   */
  toolbarAction?: React.ReactNode
  empty?: DataTableEmptyContent
  emptyFiltered?: DataTableEmptyContent
  /** Defaults to `row.id` when present, else the row index. */
  getRowId?: (originalRow: TData, index: number) => string
  /** Enables tree rows: return a row's children to make it expandable. */
  getSubRows?: (row: TData) => TData[] | undefined
  /** Initial expansion for tree tables, e.g. `true` (all) or `{ rowId: true }`. */
  defaultExpanded?: ExpandedState
  /** Set `false` to hide the pagination footer. */
  pagination?: boolean
  onRowClick?: (row: TData) => void
  /** Visual/behavior passthrough to the grid (resizable, dense, sticky, ...). */
  tableLayout?: DataGridProps<DataGridFeatures, TData>["tableLayout"]
  className?: string
}

function defaultGetRowId(row: unknown, index: number): string {
  const id = (row as { id?: unknown }).id
  return typeof id === "string" ? id : String(index)
}

// Stable identity so a loading table doesn't feed a new [] into useTable each render.
const NO_ROWS: never[] = []

function resolveUpdater<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === "function"
    ? (updater as (old: T) => T)(previous)
    : updater
}

export function DataTable<TData extends object>({
  columns,
  data,
  total,
  isLoading = false,
  query,
  onQueryChange,
  filterFields,
  filterDisplay,
  searchPlaceholder,
  debounceMs,
  showSearch = true,
  toolbarAction,
  empty = {
    title: "No results",
    description: "Nothing to show yet.",
  },
  emptyFiltered = {
    title: "No matching results",
    description: "Try adjusting your search or filters.",
  },
  getRowId = defaultGetRowId,
  getSubRows,
  defaultExpanded = {},
  pagination: showPagination = true,
  onRowClick,
  tableLayout,
  className,
}: DataTableProps<TData>) {
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({})
  const [expanded, setExpanded] = React.useState<ExpandedState>(defaultExpanded)

  // Plain string headers get the interactive header for free: sort menu when
  // the column is sortable (`enableSorting: false` opts out), move actions
  // unless locked via `meta.enableMoving: false`. Function headers render
  // as-is for full control.
  const resolvedColumns = React.useMemo(
    () =>
      columns.map((column) => {
        if (typeof column.header !== "string") return column
        const title = column.header
        const resolved = {
          ...column,
          // A string header doubles as the column id in v9; preserve it when
          // neither an explicit id nor an accessorKey identifies the column.
          id: column.id ?? ("accessorKey" in column ? undefined : title),
          header: ({
            column: headerColumn,
          }: {
            column: Parameters<typeof DataGridColumnHeader>[0]["column"]
          }) => <DataGridColumnHeader title={title} column={headerColumn} />,
          meta: { headerTitle: title, ...column.meta },
        }
        return resolved as unknown as ColumnDef<DataGridFeatures, TData>
      }),
    [columns]
  )

  const rows = data ?? NO_ROWS
  const recordCount = total ?? rows.length

  // Sorting lives in the query and is applied by the server (ORDER BY),
  // so the whole dataset is ordered before pagination slices it.
  const sorting: SortingState = React.useMemo(
    () => (query.sorting ? [query.sorting] : []),
    [query.sorting]
  )

  const pagination: PaginationState = {
    pageIndex: query.pageIndex ?? 0,
    pageSize: query.pageSize ?? DATA_TABLE_DEFAULT_PAGE_SIZE,
  }

  // Search / filter changes re-query the server, so snap back to page one.
  const handleQueryChange = (next: DataTableQuery) => {
    const refetches =
      next.search !== query.search || next.filters !== query.filters
    onQueryChange(refetches ? { ...next, pageIndex: 0 } : next)
  }

  const table = useTable({
    features: dataGridFeatures,
    data: rows,
    columns: resolvedColumns,
    getRowId,
    ...(getSubRows
      ? {
          getSubRows,
          // Keep expanded children on the same page as their parent.
          paginateExpandedRows: false,
        }
      : {}),
    manualPagination: true,
    manualSorting: true,
    pageCount: Math.max(1, Math.ceil(recordCount / pagination.pageSize)),
    onSortingChange: (updater) => {
      const next = resolveUpdater(updater, sorting)
      // A new sort order re-slices the whole dataset; restart from page one.
      onQueryChange({ ...query, sorting: next[0], pageIndex: 0 })
    },
    onColumnVisibilityChange: setColumnVisibility,
    onExpandedChange: setExpanded,
    onPaginationChange: (updater) => {
      const next = resolveUpdater(updater, pagination)
      onQueryChange({
        ...query,
        // A page-size change re-slices everything; restart from page one.
        pageIndex: next.pageSize !== pagination.pageSize ? 0 : next.pageIndex,
        pageSize: next.pageSize,
      })
    },
    state: {
      sorting,
      columnVisibility,
      expanded,
      pagination,
    },
  })

  const emptyContent = hasActiveDataTableQuery(query) ? emptyFiltered : empty

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-4", className)}>
      <DataTableToolbar
        query={query}
        onQueryChange={handleQueryChange}
        filterFields={filterFields}
        filterDisplay={filterDisplay}
        searchPlaceholder={searchPlaceholder}
        debounceMs={debounceMs}
        showSearch={showSearch}
        action={toolbarAction}
      />

      <DataGrid
        table={table}
        recordCount={recordCount}
        isLoading={isLoading}
        onRowClick={onRowClick}
        tableLayout={{
          width: "auto",
          headerSticky: true,
          columnsMovable: true,
          ...tableLayout,
        }}
        emptyMessage={
          <div className="flex flex-col items-center gap-1 py-10 text-center">
            <p className="text-sm font-medium text-foreground">
              {emptyContent.title}
            </p>
            {emptyContent.description ? (
              <p className="text-sm text-muted-foreground">
                {emptyContent.description}
              </p>
            ) : null}
          </div>
        }
      >
        <Card className="min-h-0 flex-1 gap-0 overflow-hidden p-0">
          <DataGridContainer className="flex min-h-0 flex-1 flex-col">
            <DataGridScrollArea>
              <DataGridTable />
            </DataGridScrollArea>
          </DataGridContainer>
          {showPagination ? (
            // Card footer styled to mirror the sticky table header.
            <div className="shrink-0 border-t bg-background/90 px-3 py-2 backdrop-blur-xs">
              <DataGridPagination sizes={DATA_TABLE_PAGE_SIZES} />
            </div>
          ) : null}
        </Card>
      </DataGrid>
    </div>
  )
}

export type { ColumnDef, ExpandedState } from "@tanstack/react-table"
export {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  useDataGrid,
  type DataGridFeatures,
  type DataGridColumnMeta,
} from "./data-grid/data-grid"
export {
  DataGridTable,
  DataGridTableRowExpand,
  // Alias so table code reads consistently at DataTable call sites.
  DataGridTableRowExpand as DataTableRowExpand,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from "./data-grid/data-grid-table"
export { DataGridColumnHeader as DataTableColumnHeader } from "./data-grid/data-grid-column-header"
export { DataGridColumnVisibility } from "./data-grid/data-grid-column-visibility"
export { DataGridPagination } from "./data-grid/data-grid-pagination"
export { DataGridScrollArea } from "./data-grid/data-grid-scroll-area"
export {
  EMPTY_DATA_TABLE_QUERY,
  buildDataTableServerInput,
  getEmptyFilterFlag,
  getExcludeFilterValues,
  getFilter,
  getFilterValues,
  getIncludeFilterValues,
  getNumericFilterPredicates,
  hasActiveDataTableQuery,
  idFilterOperators,
  numericFilterOperators,
  NUMERIC_FILTER_OPERATORS,
  type DataTableQuery,
  type DataTableSort,
  type NumericFilterOp,
  type NumericFilterPredicate,
} from "./data-table-query"
export { DataTableToolbar } from "./data-table-toolbar"
