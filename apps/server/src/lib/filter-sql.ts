import {
  and,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  notInArray,
  or,
  type Column,
  type SQL,
} from 'drizzle-orm'
import type { NumericFilterPredicate } from '../schemas/filters.js'

/**
 * Drizzle condition builders for the shared DataTable filter contracts
 * (`src/schemas/filters.ts`). Every list endpoint composes these — never
 * hand-roll the SQL semantics per resource.
 *
 * Each builder returns its conditions (empty when the input is absent), and
 * `listWhere` AND-s everything into a single WHERE clause:
 *
 * ```ts
 * const where = listWhere(
 *   eq(rows.organizationId, organizationId),
 *   idFilter(rows.ownerId, { include: input?.ownerIds }),
 *   searchCondition(input?.search, [rows.name]),
 * )
 * ```
 */

type WherePart = SQL | SQL[] | undefined

/** AND together fixed conditions and filter builder results into one clause. */
export function listWhere(...parts: WherePart[]): SQL | undefined {
  return and(
    ...parts.flatMap((part) =>
      part === undefined ? [] : Array.isArray(part) ? part : [part],
    ),
  )
}

/** Apply a single numeric filter predicate to a Drizzle column. */
function numericColumnCondition(
  column: Column,
  predicate: NumericFilterPredicate,
): SQL | undefined {
  const { op, value } = predicate
  switch (op) {
    case 'eq':
      return eq(column, value)
    case 'neq':
      return ne(column, value)
    case 'gt':
      return gt(column, value)
    case 'gte':
      return gte(column, value)
    case 'lt':
      return lt(column, value)
    case 'lte':
      return lte(column, value)
    default:
      return undefined
  }
}

/** Nullable-column empty / not-empty from filter chips. */
export function emptyFlag(column: Column, empty: boolean | undefined): SQL[] {
  if (empty === true) return [isNull(column)]
  if (empty === false) return [isNotNull(column)]
  return []
}

/**
 * AND-ed numeric predicates for a column, from numeric filter chips.
 * `trunc` floors values toward zero for integer columns; `empty` handles the
 * column's nullable empty / not-empty chip alongside the predicates.
 */
export function numericFilter(
  column: Column,
  predicates: NumericFilterPredicate[] | undefined,
  options?: { trunc?: boolean; empty?: boolean },
): SQL[] {
  const conditions = emptyFlag(column, options?.empty)
  for (const predicate of predicates ?? []) {
    const value = options?.trunc ? Math.trunc(predicate.value) : predicate.value
    const condition = numericColumnCondition(column, { ...predicate, value })
    if (condition) conditions.push(condition)
  }
  return conditions
}

/**
 * Include / exclude / empty semantics for an id (FK) column, from multiselect
 * filter chips. Exclusion keeps NULL rows — a row with no value is "not any
 * of" the excluded ids (a no-op tautology on NOT NULL columns).
 */
export function idFilter(
  column: Column,
  filters: {
    include?: string[]
    exclude?: string[]
    /** `true` = null only; `false` = must be set. */
    empty?: boolean
  },
): SQL[] {
  const conditions = emptyFlag(column, filters.empty)
  if (filters.include?.length) {
    conditions.push(inArray(column, filters.include))
  }
  if (filters.exclude?.length) {
    conditions.push(or(isNull(column), notInArray(column, filters.exclude))!)
  }
  return conditions
}

/** Escape LIKE/ILIKE metacharacters so user input matches literally. */
export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/**
 * Case-insensitive "contains" across one or more columns (OR-ed), for the
 * toolbar search box. Returns undefined when the search is blank.
 */
export function searchCondition(
  search: string | undefined,
  columns: Column[],
): SQL | undefined {
  const trimmed = search?.trim()
  if (!trimmed) return undefined
  const pattern = `%${escapeLikePattern(trimmed)}%`
  return or(...columns.map((column) => ilike(column, pattern)))
}
