import { asc, count, desc, type SQL } from 'drizzle-orm'
import type { PgColumn, PgSelect } from 'drizzle-orm/pg-core'
import type { OrganizationTx } from '../db/index.js'
import { LIST_DEFAULT_PAGE_SIZE } from '../schemas/filters.js'

/**
 * Server pagination/sorting engine for list endpoints. Pairs with the
 * client-safe schema composer `listQueryFields` in `schemas/filters.ts`:
 * the schema whitelists sort keys, this module maps them to SQL and runs
 * the paginated query. Filter conditions stay with `lib/filter-sql.ts`.
 *
 * Per-endpoint recipe:
 * 1. schemas.ts — `FOO_SORT_KEYS` + `listQueryFields(FOO_SORT_KEYS)`
 * 2. service.ts — sort-column map + `runListQuery` around the base select
 */

/** Pagination + sorting slice of a validated list input. */
export type ListQueryInput<TSortKey extends string = string> = {
  pageIndex?: number | undefined
  pageSize?: number | undefined
  sortBy?: TSortKey | undefined
  sortDir?: 'asc' | 'desc' | undefined
}

export type ListSortConfig<TSortKey extends string> = {
  /**
   * `sortBy` key → SQL column. Type-checked to cover every schema sort key,
   * so adding a key to `FOO_SORT_KEYS` without a column fails to compile.
   */
  columns: Record<TSortKey, PgColumn>
  /** Stable final ordering so equal values keep a deterministic page order. */
  tiebreaker: PgColumn
}

export type ResolvedListQuery = {
  limit: number
  offset: number
  orderBy: SQL[]
}

/** Apply defaults and resolve `sortBy`/`sortDir` into an ORDER BY list. */
export function resolveListQuery<TSortKey extends string>(
  input: ListQueryInput<TSortKey> | undefined,
  sort: ListSortConfig<TSortKey>,
): ResolvedListQuery {
  const limit = input?.pageSize ?? LIST_DEFAULT_PAGE_SIZE
  const pageIndex = input?.pageIndex ?? 0
  const sortColumn = input?.sortBy ? sort.columns[input.sortBy] : undefined

  const orderBy: SQL[] = sortColumn
    ? [input?.sortDir === 'desc' ? desc(sortColumn) : asc(sortColumn)]
    : []
  orderBy.push(asc(sort.tiebreaker))

  return { limit, offset: pageIndex * limit, orderBy }
}

export type ListPage<TItem> = { items: TItem[]; total: number }

/**
 * Execute a paginated list. One base query powers both results: ordered +
 * sliced for the page of rows, and wrapped as a subquery for the total
 * count — FROM/JOIN/WHERE are written exactly once in the service.
 *
 * `base` must return a fresh `.$dynamic()` builder on every call (dynamic
 * builders mutate as they chain, so the two executions cannot share one).
 */
export async function runListQuery<T extends PgSelect>(options: {
  tx: OrganizationTx
  base: () => T
  query: ResolvedListQuery
}): Promise<{ items: Awaited<T>; total: number }> {
  const { tx, base, query } = options

  // Drizzle's empty-selection guard cannot resolve for a generic builder's
  // subquery; every call site selects concrete fields, so this is safe.
  const countSource = base().as('list_rows') as never

  const [items, totalRows]: [Awaited<T>, { total: number }[]] =
    await Promise.all([
      base().orderBy(...query.orderBy).limit(query.limit).offset(query.offset),
      tx.select({ total: count() }).from(countSource),
    ])

  return { items, total: totalRows[0]?.total ?? 0 }
}
