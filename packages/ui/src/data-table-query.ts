import type { Filter, FilterFieldConfig, FilterServerMapping } from "./filters"

/** Active sort — column id doubles as the server sort key. */
export type DataTableSort = { id: string; desc: boolean }

export type DataTableQuery = {
  search: string
  filters: Filter[]
  sorting?: DataTableSort
  pageIndex?: number
  pageSize?: number
}

export const EMPTY_DATA_TABLE_QUERY: DataTableQuery = {
  search: "",
  filters: [],
}

export type NumericFilterOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte"

export type NumericFilterPredicate = {
  op: NumericFilterOp
  value: number
}

const NUMERIC_OP_ALIASES: Record<string, NumericFilterOp> = {
  eq: "eq",
  equals: "eq",
  is: "eq",
  neq: "neq",
  not_equals: "neq",
  is_not: "neq",
  gt: "gt",
  greater_than: "gt",
  gte: "gte",
  greater_than_or_equal: "gte",
  lt: "lt",
  less_than: "lt",
  lte: "lte",
  less_than_or_equal: "lte",
}

const EMPTY_OPERATORS = [
  { value: "empty", label: "is empty" },
  { value: "not_empty", label: "is not empty" },
] as const

const NUMERIC_VALUE_OPERATORS = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gt", label: "greater than" },
  { value: "gte", label: "greater than or equal" },
  { value: "lt", label: "less than" },
  { value: "lte", label: "less than or equal" },
] as const

export const NUMERIC_FILTER_OPERATORS = [
  ...NUMERIC_VALUE_OPERATORS,
  ...EMPTY_OPERATORS,
] as const

/**
 * Operator set for a number filter field. Pass `nullable: false` for columns
 * where empty / not-empty makes no sense.
 */
export function numericFilterOperators(options?: { nullable?: boolean }) {
  return options?.nullable === false
    ? [...NUMERIC_VALUE_OPERATORS]
    : [...NUMERIC_VALUE_OPERATORS, ...EMPTY_OPERATORS]
}

/**
 * Operator set for an id-list (multiselect) filter field. Only offers
 * operators the `ids` server mapping can express — "includes all" makes no
 * sense against a single-valued FK column and would silently no-op.
 */
export function idFilterOperators(options?: { nullable?: boolean }) {
  const base = [
    { value: "is_any_of", label: "is any of" },
    { value: "is_not_any_of", label: "is not any of" },
  ]
  return options?.nullable === false ? base : [...base, ...EMPTY_OPERATORS]
}

export function getFilter(
  filters: Filter[],
  fieldKey: string
): Filter | undefined {
  return filters.find((filter) => filter.field === fieldKey)
}

export function getFiltersForField(
  filters: Filter[],
  fieldKey: string
): Filter[] {
  return filters.filter((filter) => filter.field === fieldKey)
}

/** Values from a filter field (for mapping into API inputs). */
export function getFilterValues(
  filters: Filter[],
  fieldKey: string
): string[] {
  const filter = getFilter(filters, fieldKey)
  if (!filter || filter.values.length === 0) return []
  return filter.values.map(String)
}

const INCLUDE_OPERATORS = new Set(["is", "is_any_of", "includes_any_of"])
const EXCLUDE_OPERATORS = new Set(["is_not", "is_not_any_of", "excludes_all"])

function collectValuesByOperator(
  filters: Filter[],
  fieldKey: string,
  operators: Set<string>
): string[] | undefined {
  const values = new Set<string>()
  for (const filter of getFiltersForField(filters, fieldKey)) {
    if (!operators.has(filter.operator)) continue
    for (const value of filter.values) values.add(String(value))
  }
  return values.size > 0 ? [...values] : undefined
}

/**
 * Values to send as an "include" list, merged across every `is` / `is_any_of`
 * chip for the field. Returns undefined when no include chip has values.
 */
export function getIncludeFilterValues(
  filters: Filter[],
  fieldKey: string
): string[] | undefined {
  return collectValuesByOperator(filters, fieldKey, INCLUDE_OPERATORS)
}

/** Exclude-list counterpart of {@link getIncludeFilterValues}. */
export function getExcludeFilterValues(
  filters: Filter[],
  fieldKey: string
): string[] | undefined {
  return collectValuesByOperator(filters, fieldKey, EXCLUDE_OPERATORS)
}

/** Empty / not-empty flag; when multiple chips conflict, the newest wins. */
export function getEmptyFilterFlag(
  filters: Filter[],
  fieldKey: string
): boolean | undefined {
  let flag: boolean | undefined
  for (const filter of getFiltersForField(filters, fieldKey)) {
    if (filter.operator === "empty") flag = true
    else if (filter.operator === "not_empty") flag = false
  }
  return flag
}

/**
 * Map number-style filter chips into API predicates.
 * @param transform Optional value transform (e.g. dollars → cents).
 */
export function getNumericFilterPredicates(
  filters: Filter[],
  fieldKey: string,
  transform: (raw: number) => number = (n) => n
): NumericFilterPredicate[] {
  return getFiltersForField(filters, fieldKey).flatMap((filter) => {
    const op = NUMERIC_OP_ALIASES[filter.operator]
    if (!op) return []
    const raw = Number(filter.values[0])
    if (!Number.isFinite(raw)) return []
    return [{ op, value: transform(raw) }]
  })
}

function applyServerMapping(
  input: Record<string, unknown>,
  filters: Filter[],
  fieldKey: string,
  server: FilterServerMapping
) {
  if (server.kind === "ids") {
    const include = getIncludeFilterValues(filters, fieldKey)
    if (include) input[server.param] = include

    if (server.excludeParam) {
      const exclude = getExcludeFilterValues(filters, fieldKey)
      if (exclude) input[server.excludeParam] = exclude
    }

    if (server.emptyParam) {
      const empty = getEmptyFilterFlag(filters, fieldKey)
      if (empty !== undefined) input[server.emptyParam] = empty
    }
    return
  }

  const predicates = getNumericFilterPredicates(
    filters,
    fieldKey,
    server.transform
  )
  if (predicates.length > 0) input[server.param] = predicates

  if (server.emptyParam) {
    const empty = getEmptyFilterFlag(filters, fieldKey)
    if (empty !== undefined) input[server.emptyParam] = empty
  }
}

/**
 * Build a server list-query object from DataTable UI state + field `server` maps.
 * Pages pass the result straight into tRPC — no per-field hand wiring.
 */
export function buildDataTableServerInput(
  query: DataTableQuery,
  fields: FilterFieldConfig[]
): Record<string, unknown> {
  const input: Record<string, unknown> = {}
  const search = query.search.trim()
  if (search) input.search = search

  for (const field of fields) {
    if (!field.key || !field.server) continue
    applyServerMapping(input, query.filters, field.key, field.server)
  }

  if (query.sorting) {
    input.sortBy = query.sorting.id
    input.sortDir = query.sorting.desc ? "desc" : "asc"
  }

  if (query.pageIndex != null) input.pageIndex = query.pageIndex
  if (query.pageSize != null) input.pageSize = query.pageSize

  return input
}

export function hasActiveDataTableQuery(query: DataTableQuery): boolean {
  return query.search.trim().length > 0 || query.filters.length > 0
}
