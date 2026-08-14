"use client"

import * as React from "react"
import {
  createColumnHelper,
  useTable,
  type ColumnDef,
  type ColumnVisibilityState,
  type ExpandedState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type Updater,
} from "@tanstack/react-table"

import { cn } from "../utils"
import { Card } from "./card"
import { EmptyState } from "./empty-state"
import { type PlatformIconName } from "./icon"
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
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from "./data-grid/data-grid-table"
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
  /** Any icon key from the shared icon set, centered above the title. */
  icon?: PlatformIconName
  title: string
  description?: string
  /** Rendered under the copy — e.g. an "Add tenant" button. */
  action?: React.ReactNode
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
  /**
   * Opt-in row selection (default OFF). When falsy — every existing call site —
   * no checkbox column is prepended, no selection state is wired, and the
   * selection bar never renders, so those tables are byte-behavior-unchanged.
   * When true, a leading checkbox column is added and selection state is
   * tracked internally (or controlled via `rowSelection`/`onRowSelectionChange`).
   */
  enableRowSelection?: boolean
  /** Controlled selection map (`{ [rowId]: true }`). Omit to use internal state. */
  rowSelection?: RowSelectionState
  /** Controlled-selection change handler. Required only alongside `rowSelection`. */
  onRowSelectionChange?: (selection: RowSelectionState) => void
  /**
   * Renders a selection action bar ABOVE the grid, only while a selection is
   * non-empty (and only when `enableRowSelection` is on). Receives the selected
   * row ids and a `clearSelection` callback.
   */
  selectionActions?: (ctx: {
    selectedRowIds: string[]
    clearSelection: () => void
  }) => React.ReactNode
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
  enableRowSelection = false,
  rowSelection: controlledRowSelection,
  onRowSelectionChange,
  selectionActions,
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

  // Selection is opt-in; when disabled none of this touches the table instance.
  const [internalRowSelection, setInternalRowSelection] =
    React.useState<RowSelectionState>({})
  const rowSelection = controlledRowSelection ?? internalRowSelection
  const setRowSelection = React.useCallback(
    (next: RowSelectionState) => {
      if (onRowSelectionChange) onRowSelectionChange(next)
      if (controlledRowSelection === undefined) setInternalRowSelection(next)
    },
    [onRowSelectionChange, controlledRowSelection]
  )

  // Plain string headers get the interactive header for free: sort menu when
  // the column is sortable (`enableSorting: false` opts out), move actions
  // unless locked via `meta.enableMoving: false`. Function headers render
  // as-is for full control.
  const resolvedColumns = React.useMemo(() => {
    const mapped = columns.map((column) => {
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
    })

    if (!enableRowSelection) return mapped

    // Leading checkbox column — only present when selection is opted in, so the
    // column set (and therefore layout) of every other table is unchanged.
    const selectColumn = {
      id: "select",
      header: () => <DataGridTableRowSelectAll />,
      cell: ({ row }: { row: Parameters<typeof DataGridTableRowSelect>[0]["row"] }) => (
        <DataGridTableRowSelect row={row} />
      ),
      enableSorting: false,
      enableResizing: false,
      size: 44,
      meta: { enableMoving: false, headerClassName: "w-11", cellClassName: "w-11" },
    } as unknown as ColumnDef<DataGridFeatures, TData>

    return [selectColumn, ...mapped]
  }, [columns, enableRowSelection])

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
    ...(enableRowSelection
      ? {
          enableRowSelection: true,
          onRowSelectionChange: (updater: Updater<RowSelectionState>) => {
            setRowSelection(resolveUpdater(updater, rowSelection))
          },
        }
      : {}),
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
      ...(enableRowSelection ? { rowSelection } : {}),
    },
  })

  const emptyContent = hasActiveDataTableQuery(query) ? emptyFiltered : empty
  const isEmpty = !isLoading && recordCount === 0

  const selectedRowIds = React.useMemo(
    () =>
      enableRowSelection
        ? Object.keys(rowSelection).filter((id) => rowSelection[id])
        : [],
    [enableRowSelection, rowSelection]
  )
  const clearSelection = React.useCallback(
    () => setRowSelection({}),
    [setRowSelection]
  )
  const selectionBar =
    enableRowSelection && selectionActions && selectedRowIds.length > 0
      ? selectionActions({ selectedRowIds, clearSelection })
      : null

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

      {selectionBar}

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
        // The empty state is centered over the grid body via the overlay
        // below; the in-cell slot is left blank so it doesn't render twice.
        emptyMessage={<></>}
      >
        <Card className="min-h-0 flex-1 gap-0 overflow-hidden p-0">
          <DataGridContainer className="relative flex min-h-0 flex-1 flex-col">
            <DataGridScrollArea>
              <DataGridTable />
            </DataGridScrollArea>
            {isEmpty ? (
              // Absolute overlay fills the grid body (definite height from the
              // flex-1 card), so the message truly centers instead of pinning
              // to the top of the short empty table. Header stays visible above.
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
                <EmptyState
                  icon={emptyContent.icon}
                  title={emptyContent.title}
                  description={emptyContent.description}
                  action={emptyContent.action}
                  className="pointer-events-auto"
                />
              </div>
            ) : null}
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
