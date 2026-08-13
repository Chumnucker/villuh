"use client"

import * as React from "react"
import { useQueryStates } from "nuqs"

import { DATA_TABLE_DEFAULT_PAGE_SIZE } from "../data-table"
import {
  buildDataTableServerInput,
  type DataTableQuery,
} from "../data-table-query"
import type { Filter, FilterFieldConfig } from "../filters"
import type { FieldFilter, TableDefinition, TableFieldDef } from "./types"

/**
 * D-26: table state is `replace`. Nobody should need twelve back presses to
 * escape a table they were filtering.
 *
 * D-42 caveat: nuqs's throttle queue is a global singleton that merges every
 * update inside a ~150 ms window into one history write and applies `push` if
 * ANY contributing update asked for it. A table update coalesced with an
 * overlay open therefore inherits `push`. That is acceptable — one history
 * entry capturing both the overlay and the table state is exactly the
 * shareable-link goal — but it means D-26 holds only for table changes with no
 * overlay interaction. Do not fire an overlay open and a table update from one
 * handler.
 */
const TABLE_OPTIONS = { history: "replace", scroll: false } as const

/**
 * URL-backed table query hook (D-28) — the replacement for the former plain
 * `useState`-based table-query hook. Identical return signature plus
 * `filterFields`, so a call site swaps one hook and nothing else — `DataTable`,
 * `DataGrid`, the column defs, and `DataTableToolbar` are untouched.
 */
export function useDataTableQueryState<
  F extends Record<string, TableFieldDef> = Record<string, TableFieldDef>,
  TInput = Record<string, unknown>,
>(table: TableDefinition<F>, options?: { hide?: readonly string[] }) {
  // `table.parsers` / `table.urlKeys` are frozen module-scope objects built by
  // defineTable — requirement 2 of D-41. Never build a keyMap in this body.
  const [values, setParams] = useQueryStates(
    table.parsers as Parameters<typeof useQueryStates>[0],
    { ...TABLE_OPTIONS, urlKeys: table.urlKeys }
  )

  const filterFields: FilterFieldConfig[] = table.useFilterFields(options)

  const query = React.useMemo<DataTableQuery>(() => {
    const filters: Filter[] = []
    for (const key of table.fieldKeys) {
      const predicates = (values as Record<string, unknown>)[
        key
      ] as FieldFilter[]
      predicates.forEach((p, index) => {
        filters.push({
          // D-24: deterministic. Two parses of the same URL yield the same ids,
          // so React keys and chip identity are stable across renders.
          id: `${key}:${p.operator}:${index}`,
          field: key,
          operator: p.operator,
          values: p.values,
        })
      })
    }
    return {
      search: (values as Record<string, unknown>).q as string,
      filters,
      sorting:
        ((values as Record<string, unknown>).sort as DataTableQuery["sorting"]) ??
        undefined,
      pageIndex: (values as Record<string, unknown>).page as number,
      pageSize: (values as Record<string, unknown>).size as number,
    }
  }, [values, table])

  // D-25 / D-41 requirement 1. `setParams` is nuqs's own useCallback-wrapped
  // setter; its only unstable dependency would be `stableKeyMap`, which cannot
  // churn here because the parser map is frozen at module scope and every
  // non-primitive default declares `eq`. If this identity ever changes per
  // render, DataTableToolbar re-arms its 300 ms timer forever and the search
  // box never commits (Pitfall 1).
  const setQuery = React.useCallback(
    (next: DataTableQuery) => {
      // ONE setter call -> ONE history entry (RESEARCH §4). Do not split this.
      void setParams({
        q: next.search || null,
        sort: next.sorting ?? null,
        page: next.pageIndex ?? 0,
        size: next.pageSize ?? DATA_TABLE_DEFAULT_PAGE_SIZE,
        ...table.toFieldParams(next.filters),
      } as never)
    },
    [setParams, table]
  )

  // D-30: the whole data-table-query.ts mapping layer is kept as-is.
  const serverInput = React.useMemo(
    () => buildDataTableServerInput(query, filterFields) as TInput,
    [query, filterFields]
  )

  return { query, setQuery, serverInput, filterFields }
}
