"use client"

import * as React from "react"

import type { Filter, FilterFieldConfig } from "../filters"
import { PlatformIcon } from "../icon"
import { registerQueryStateKeys } from "./key-registry"
import {
  pageParser,
  parseAsFieldFilters,
  parseAsSort,
  searchParser,
  sizeParser,
} from "./table-params"
import type {
  FieldFilter,
  FilterOptionItem,
  TableConfig,
  TableDefinition,
  TableFieldDef,
  TableFieldUi,
} from "./types"

const EMPTY_OPTIONS: FilterOptionItem[] = Object.freeze(
  []
) as unknown as FilterOptionItem[]

/** Id-list (multiselect) filter field. Pair with `idFilterOperators()`. */
export function ids(
  def: TableFieldUi & {
    operators: TableFieldDef["operators"]
    server: Extract<TableFieldDef["server"], { kind: "ids" }>
    useOptions?: TableFieldDef["useOptions"]
  }
): TableFieldDef {
  return { ...def, kind: "ids" }
}

/** Number filter field. Pair with `numericFilterOperators()`. */
export function numeric(
  def: TableFieldUi & {
    operators: TableFieldDef["operators"]
    server: Extract<TableFieldDef["server"], { kind: "numeric" }>
    useOptions?: TableFieldDef["useOptions"]
  }
): TableFieldDef {
  return { ...def, kind: "numeric" }
}

/**
 * One config object per table (D-21).
 *
 * `name` is a definition-unique identifier — `"units"`, `"leases"` — and is
 * INDEPENDENT of `namespace`. It is the owner string this definition registers
 * its URL keys under. Do not derive it from `namespace`; see the note on the
 * `registerQueryStateKeys` call below for why that breaks D-29.
 *
 * `namespace` is `null` for the normal case — one table per page, so keys read
 * best unprefixed (`?q=main&status=any:s1&sort=-baseRent&page=2&size=50`).
 * Pass a namespace only when a single page hosts two tables; keys then become
 * `${namespace}:${key}` (D-29 — table prefixes use `:`, overlay namespaces use
 * `.`, so the two schemes can never converge).
 *
 * Everything below runs ONCE, at module evaluation. The parser map and the
 * urlKeys object are frozen and never rebuilt, which is requirement 2 of D-41 —
 * a keyMap rebuilt per render destabilizes nuqs's `stableKeyMap` and
 * permanently re-arms DataTableToolbar's 300 ms search debounce.
 */
export function defineTable<const F extends Record<string, TableFieldDef>>(
  name: string,
  namespace: string | null,
  config: TableConfig<F>
): TableDefinition<F> {
  const fieldKeys = Object.keys(config.fields) as (keyof F & string)[]
  const entries = fieldKeys.map((key) => [key, config.fields[key]!] as const)
  const prefix = namespace ? `${namespace}:` : ""

  const parsers = Object.freeze({
    q: searchParser,
    sort: parseAsSort(config.sortable),
    page: pageParser,
    size: sizeParser,
    ...Object.fromEntries(
      entries.map(([key, def]) => [
        key,
        parseAsFieldFilters(
          key,
          def.operators.map((op) => op.value)
        ),
      ])
    ),
  })

  const urlKeys = Object.freeze(
    Object.fromEntries(
      Object.keys(parsers).map((key) => [key, `${prefix}${key}`])
    )
  ) as Readonly<Record<string, string>>

  // Owner is `name`, NOT `namespace ?? "table"`. D-29's stated trigger is a
  // second table on one page — which is a second UNPREFIXED table. Under a
  // namespace-derived owner both would register `q`/`sort`/`page`/`size` under
  // the literal owner "table", key-registry.ts would see same-owner
  // re-registration, treat it as HMR, and return silently — the assert would be
  // inert for the exact scenario it exists to catch. Keyed on `name`, the
  // second definition registers a different owner against the same keys and
  // throws.
  registerQueryStateKeys(name, Object.values(urlKeys), "table")

  /**
   * D-22 binder. The config is a frozen module-scope object whose entry order
   * never changes, so this loop unrolls to a fixed hook sequence. Fields are
   * NEVER conditionally skipped — a hidden field's `useOptions` still runs and
   * receives `hidden: true` so it can gate its own tRPC query; only the RESULT
   * is filtered. Skipping the iteration instead is Pitfall 2: "Rendered fewer
   * hooks than during the previous render" when navigating between /units and a
   * property Units tab.
   */
  function useFilterFields(options?: {
    hide?: readonly string[]
  }): FilterFieldConfig[] {
    const hide = options?.hide
    const resolved: FilterFieldConfig[] = []

    for (const [key, def] of entries) {
      const hidden = hide?.includes(key) ?? false
      const { icon, useOptions, kind, ...ui } = def
      // eslint-disable-next-line react-hooks/rules-of-hooks -- static, frozen, module-scope config; entry order never changes and no field is ever conditionally skipped, so the hook sequence is fixed. See D-22 / RESEARCH §6.
      const opts = useOptions?.(hidden) ?? EMPTY_OPTIONS
      if (hidden) continue
      resolved.push({
        ...ui,
        key,
        type: kind === "ids" ? "multiselect" : "text",
        icon: icon ? <PlatformIcon icon={icon} size={16} /> : undefined,
        options: kind === "ids" ? opts : undefined,
        operators: def.operators,
        server: def.server,
      })
    }

    return resolved
  }

  /** Inverse of the parse side: `DataTableQuery.filters` -> one param value per field. */
  function toFieldParams(
    filters: Filter[]
  ): Record<string, FieldFilter[] | null> {
    const out: Record<string, FieldFilter[] | null> = {}
    for (const key of fieldKeys) {
      const predicates = filters
        .filter((f) => f.field === key)
        .map((f) => ({ operator: f.operator, values: f.values.map(String) }))
      // `null` clears the param; clearOnDefault would also clear it against the
      // frozen empty default, but null is explicit and one fewer comparison.
      out[key] = predicates.length > 0 ? predicates : null
    }
    return out
  }

  return {
    name,
    namespace,
    fieldKeys,
    parsers,
    urlKeys,
    useFilterFields,
    toFieldParams,
  }
}
