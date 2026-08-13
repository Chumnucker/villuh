"use client"

import * as React from "react"

import { Button } from "./button"
import { Filters, type FilterFieldConfig } from "./filters"
import { PlatformIcon } from "./icon"
import { SearchInput } from "./input"
import {
  hasActiveDataTableQuery,
  type DataTableQuery,
} from "./data-table-query"

const DEFAULT_DEBOUNCE_MS = 300

export type DataTableToolbarProps = {
  query: DataTableQuery
  onQueryChange: (query: DataTableQuery) => void
  filterFields?: FilterFieldConfig[]
  searchPlaceholder?: string
  debounceMs?: number
  showSearch?: boolean
  /** Filters presentation: inline chips (default) or compact in-dropdown management. */
  filterDisplay?: "inline" | "compact"
  /**
   * Pinned to the right of the toolbar (e.g. an "Add unit" button) —
   * independent of search/filters, and keeps the toolbar rendered even if
   * both `showSearch` is false and there are no `filterFields`.
   */
  action?: React.ReactNode
}

export function DataTableToolbar({
  query,
  onQueryChange,
  filterFields,
  searchPlaceholder = "Search...",
  debounceMs = DEFAULT_DEBOUNCE_MS,
  showSearch = true,
  filterDisplay,
  action,
}: DataTableToolbarProps) {
  const [searchInput, setSearchInput] = React.useState(query.search)
  const queryRef = React.useRef(query)
  queryRef.current = query

  React.useEffect(() => {
    setSearchInput(query.search)
  }, [query.search])

  React.useEffect(() => {
    if (searchInput === queryRef.current.search) return

    const timer = window.setTimeout(() => {
      onQueryChange({ ...queryRef.current, search: searchInput })
    }, debounceMs)

    return () => window.clearTimeout(timer)
  }, [searchInput, debounceMs, onQueryChange])

  const hasFilters = Boolean(filterFields && filterFields.length > 0)
  const hasActive = hasActiveDataTableQuery(query)

  if (!showSearch && !hasFilters && !action) return null

  return (
    <div className="flex flex-wrap items-start justify-between gap-2.5">
      <div className="flex min-w-0 flex-1 flex-wrap items-start gap-2.5">
        {showSearch ? (
          <SearchInput
            placeholder={searchPlaceholder}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="w-56 border"
            size="sm"
          />
        ) : null}

        {hasFilters ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-2.5">
            <Filters
              filters={query.filters}
              fields={filterFields!}
              size="sm"
              display={filterDisplay}
              enableShortcut
              onChange={(filters) => onQueryChange({ ...query, filters })}
            />

            {hasActive ? (
              <Button
                variant="outline"
                size="sm"
                className="bg-input hover:bg-input/80 dark:bg-input"
                onClick={() => {
                  setSearchInput("")
                  onQueryChange({ ...query, search: "", filters: [] })
                }}
              >
                <PlatformIcon icon="IconCrossLarge" size={16} />
                Clear
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
