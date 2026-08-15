"use client"

import * as React from "react"
import { useQueryStates } from "nuqs"

import { DATA_TABLE_DEFAULT_PAGE_SIZE } from "../data-table"
import {
  buildDataTableServerInput,
  type DataTableQuery,
  type DataTableSort,
} from "../data-table-query"
import type { Filter, FilterFieldConfig } from "../filters"
import type { TableDefinition, TableFieldDef } from "./define-table"
import { claimMountedTableKeys } from "./key-registry"
import type { FieldFilter } from "./table-params"

/**
 * Table state is `replace` — nobody should need twelve back presses to escape
 * a table they were filtering. Caveat: nuqs merges all updates inside a
 * ~150ms window into ONE history write (push wins), so never fire a table
 * update and an overlay open from the same handler.
 */
const TABLE_OPTIONS = { history: "replace", scroll: false } as const

/**
 * What `TableParsers<F>` provably parses to / accepts as a patch. TS cannot
 * resolve nuqs's mapped types over the generic intersection, so the two
 * assertions below re-state the shape instead of re-deriving it.
 */
type TableValues<F extends Record<string, TableFieldDef>> = {
  q: string
  sort: DataTableSort | null
  page: number
  size: number
} & { [K in keyof F & string]: FieldFilter[] }

type TablePatch<F extends Record<string, TableFieldDef>> = Partial<
  {
    q: string | null
    sort: DataTableSort | null
    page: number | null
    size: number | null
  } & { [K in keyof F & string]: FieldFilter[] | null }
>

/**
 * URL-backed table query hook. Same return signature as a plain-state table
 * query hook plus `filterFields`, so `DataTable` / `DataGrid` / the column
 * defs / `DataTableToolbar` are all untouched by the URL backing.
 *
 * `setQuery` is referentially stable: it closes over nuqs's own stable setter
 * only. If that ever changes, DataTableToolbar re-arms its 300 ms search
 * debounce on every render and the search box never commits.
 */
export function useDataTableQueryState<
  F extends Record<string, TableFieldDef>,
  TInput = Record<string, unknown>,
>(table: TableDefinition<F>, options?: { hide?: readonly string[] }) {
  // `table.parsers` / `table.urlKeys` are frozen module-scope objects built
  // by defineTable. Never build a keyMap in this body.
  const [rawValues, rawSetParams] = useQueryStates(table.parsers, {
    ...TABLE_OPTIONS,
    urlKeys: table.urlKeys,
  })
  const values = rawValues as TableValues<F>
  const setParams = rawSetParams as (patch: TablePatch<F>) => Promise<unknown>

  // Dev-only guard: two tables mounted on one page binding the same URL key
  // cross-contaminate silently, so claim the keys for the lifetime of the
  // mount and throw loudly on overlap. Tables on different routes never
  // coexist and may share unprefixed keys freely.
  React.useEffect(
    () => claimMountedTableKeys(table.name, Object.values(table.urlKeys)),
    [table]
  )

  const filterFields: FilterFieldConfig[] = table.useFilterFields(options)

  const query = React.useMemo<DataTableQuery>(() => {
    const filters: Filter[] = []
    for (const key of table.fieldKeys) {
      values[key].forEach((p, index) => {
        filters.push({
          // Deterministic: two parses of the same URL yield the same ids, so
          // React keys and chip identity are stable across renders.
          id: `${key}:${p.operator}:${index}`,
          field: key,
          operator: p.operator,
          values: p.values,
        })
      })
    }
    return {
      search: values.q,
      filters,
      sorting: values.sort ?? undefined,
      pageIndex: values.page,
      pageSize: values.size,
    }
  }, [values, table])

  const setQuery = React.useCallback(
    (next: DataTableQuery) => {
      // ONE setter call -> ONE history entry. Do not split this.
      void setParams({
        q: next.search || null,
        sort: next.sorting ?? null,
        page: next.pageIndex ?? 0,
        size: next.pageSize ?? DATA_TABLE_DEFAULT_PAGE_SIZE,
        ...table.toFieldParams(next.filters),
      })
    },
    [setParams, table]
  )

  const serverInput = React.useMemo(
    () => buildDataTableServerInput(query, filterFields) as TInput,
    [query, filterFields]
  )

  return { query, setQuery, serverInput, filterFields }
}
