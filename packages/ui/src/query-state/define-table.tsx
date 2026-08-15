"use client"

import * as React from "react"

import type {
  Filter,
  FilterFieldConfig,
  FilterOperator,
  FilterServerMapping,
} from "../filters"
import { PlatformIcon, type PlatformIconName } from "../icon"
import { registerQueryStateKeys } from "./key-registry"
import {
  pageParser,
  parseAsFieldFilters,
  parseAsSort,
  searchParser,
  sizeParser,
  type FieldFilter,
} from "./table-params"

/* ── Field declarations ────────────────────────────────────────────────── */

export type FilterOptionItem = { value: string; label: string }

/** Presentation props forwarded verbatim onto the emitted `FilterFieldConfig`. */
export type TableFieldUi = Omit<
  FilterFieldConfig,
  "key" | "icon" | "options" | "operators" | "server"
> & {
  label: string
  /** Icon by NAME, not JSX, so table configs stay plain `.ts`. */
  icon?: PlatformIconName
}

/**
 * One filter field declaration. Carries everything the URL parser, the
 * operator validator, the picker UI, and the tRPC input mapping need.
 */
export type TableFieldDef = TableFieldUi & {
  kind: "ids" | "numeric"
  /** The URL parser validates against exactly this list; anything else is dropped. */
  operators: FilterOperator[]
  /** Fed unchanged into `buildDataTableServerInput`. */
  server: FilterServerMapping
  /**
   * Options source. The binder calls this for EVERY field on EVERY render —
   * never conditionally — so the hook sequence is fixed. `hidden` lets the
   * hook gate its own tRPC query (`enabled: !hidden`) without changing the
   * hook count.
   */
  useOptions?: (hidden: boolean) => FilterOptionItem[]
}

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

/* ── Table definition ──────────────────────────────────────────────────── */

/** Reserved by the core table params; a filter field cannot claim them. */
const RESERVED_FIELD_KEYS = new Set(["q", "sort", "page", "size"])

/**
 * The concrete parser map a definition carries: the four core params plus one
 * field-filter parser per declared field. Fully typed so `useQueryStates`
 * infers the values shape with no casts anywhere downstream.
 */
export type TableParsers<F extends Record<string, TableFieldDef>> = {
  q: typeof searchParser
  sort: ReturnType<typeof parseAsSort>
  page: typeof pageParser
  size: typeof sizeParser
} & { [K in keyof F & string]: ReturnType<typeof parseAsFieldFilters> }

export type TableConfig<
  F extends Record<string, TableFieldDef> = Record<string, TableFieldDef>,
> = {
  fields: F
  /** Column ids `sort` is validated against. Must match the server's sort key enum. */
  sortable: readonly string[]
  /**
   * URL key prefix. Omit for the normal case — one table per page, unprefixed
   * keys (`?q=…&status=…&sort=…`). Set it only when a single page hosts two
   * tables; keys then become `${namespace}:${key}` (table prefixes use `:`,
   * overlay namespaces use `.`, so the two schemes can never converge).
   */
  namespace?: string
}

export type TableDefinition<
  F extends Record<string, TableFieldDef> = Record<string, TableFieldDef>,
> = {
  /**
   * Definition-unique identifier, independent of `namespace` — the OWNER
   * string in the mount-time key guard. It cannot be derived from
   * `namespace`: the collision the guard exists to catch is two mounted
   * tables that are BOTH unprefixed, and a namespace-derived owner would
   * read that as the same table mounted twice and stay silent.
   */
  name: string
  namespace: string | null
  fieldKeys: readonly (keyof F & string)[]
  /** Frozen at module scope — required for nuqs setter stability. */
  parsers: Readonly<TableParsers<F>>
  urlKeys: Readonly<Record<keyof TableParsers<F> & string, string>>
  /** Options binder. `hide` filters the RESULT, never the hook iteration. */
  useFilterFields: (options?: {
    hide?: readonly string[]
  }) => FilterFieldConfig[]
  /** Inverse of the parse side: `DataTableQuery.filters` -> one param value per field. */
  toFieldParams: (filters: Filter[]) => Record<keyof F & string, FieldFilter[] | null>
}

const EMPTY_OPTIONS: FilterOptionItem[] = Object.freeze(
  []
) as unknown as FilterOptionItem[]

/**
 * One config object per table: URL parsing, operator validation, the picker
 * UI, and the tRPC input mapping all derive from the declaration. Call it at
 * module scope only — the parser map and urlKeys are frozen and never
 * rebuilt, which is what keeps nuqs's setter identity stable (a keyMap
 * rebuilt per render permanently re-arms DataTableToolbar's search debounce).
 */
export function defineTable<const F extends Record<string, TableFieldDef>>(
  name: string,
  config: TableConfig<F>
): TableDefinition<F> {
  const fieldKeys = Object.keys(config.fields) as (keyof F & string)[]
  const entries = fieldKeys.map((key) => [key, config.fields[key]] as const)
  const namespace = config.namespace ?? null
  const prefix = namespace ? `${namespace}:` : ""

  if (process.env.NODE_ENV !== "production") {
    for (const key of fieldKeys) {
      if (RESERVED_FIELD_KEYS.has(key)) {
        throw new Error(
          `[query-state] Field key "${key}" (table "${name}") is reserved for a core table param.`
        )
      }
    }
  }

  // `Object.fromEntries` erases the key type; this is the one place the
  // mapped type is asserted back on.
  const fieldParsers = Object.fromEntries(
    entries.map(([key, def]) => [
      key,
      parseAsFieldFilters(
        key,
        def.operators.map((op) => op.value)
      ),
    ])
  ) as { [K in keyof F & string]: ReturnType<typeof parseAsFieldFilters> }

  const parsers: Readonly<TableParsers<F>> = Object.freeze({
    q: searchParser,
    sort: parseAsSort(config.sortable),
    page: pageParser,
    size: sizeParser,
    ...fieldParsers,
  })

  const urlKeys = Object.freeze(
    Object.fromEntries(
      Object.keys(parsers).map((key) => [key, `${prefix}${key}`])
    )
  ) as Readonly<Record<keyof TableParsers<F> & string, string>>

  // Scheme check only (no "." in table keys). Collision detection happens at
  // mount time in useDataTableQueryState — tables on different routes may
  // share unprefixed keys freely.
  registerQueryStateKeys(name, Object.values(urlKeys), "table")

  /**
   * The config is a frozen module-scope object whose entry order never
   * changes, so this loop unrolls to a FIXED hook sequence. Fields are never
   * conditionally skipped — a hidden field's `useOptions` still runs and
   * receives `hidden: true` so it can gate its own tRPC query; only the
   * RESULT is filtered. Skipping the iteration instead changes the hook count
   * between pages that hide different fields.
   */
  function useFilterFields(options?: {
    hide?: readonly string[]
  }): FilterFieldConfig[] {
    const hide = options?.hide
    const resolved: FilterFieldConfig[] = []

    for (const [key, def] of entries) {
      const hidden = hide?.includes(key) ?? false
      const { icon, useOptions, kind, ...ui } = def
      // eslint-disable-next-line react-hooks/rules-of-hooks -- static, frozen, module-scope config; entry order never changes and no field is ever conditionally skipped, so the hook sequence is fixed.
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

  function toFieldParams(
    filters: Filter[]
  ): Record<keyof F & string, FieldFilter[] | null> {
    const out = {} as Record<keyof F & string, FieldFilter[] | null>
    for (const key of fieldKeys) {
      const predicates = filters
        .filter((f) => f.field === key)
        .map((f) => ({ operator: f.operator, values: f.values.map(String) }))
      // `null` clears the param; clearOnDefault would also clear it against
      // the frozen empty default, but null is explicit.
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
