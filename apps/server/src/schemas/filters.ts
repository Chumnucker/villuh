import { z } from 'zod'

/**
 * Shared DataTable / list-filter Zod contracts.
 * Module list schemas compose these — do not redefine ops per resource.
 *
 * Client-safe (imported by landlord forms via `@villuh/server/schemas/filters`).
 * Drizzle helpers: `src/lib/filter-sql.ts` (server-only).
 */

export const NUMERIC_FILTER_OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'] as const

export const numericFilterOpSchema = z.enum(NUMERIC_FILTER_OPS)

export const numericFilterPredicateSchema = z.object({
  op: numericFilterOpSchema,
  value: z.number().finite(),
})

export type NumericFilterOp = z.infer<typeof numericFilterOpSchema>
export type NumericFilterPredicate = z.infer<typeof numericFilterPredicateSchema>

/** Default list-query search string. */
export const listSearchSchema = z.string().trim().max(100).optional()

/** Include / exclude id lists from multiselect filters. */
export const filterIdListSchema = z.array(z.uuid()).max(50).optional()

/** AND-ed numeric predicates from number filter chips. */
export const numericFilterPredicatesSchema = z
  .array(numericFilterPredicateSchema)
  .max(10)
  .optional()

/** `true` = null/unassigned only; `false` = must be set. */
export const filterEmptyFlagSchema = z.boolean().optional()

/**
 * Sort direction for server-driven DataTable sorting. Pair with a per-module
 * `sortBy: z.enum([...])` whitelist of sortable columns.
 */
export const listSortDirSchema = z.enum(['asc', 'desc']).optional()

/** Keep in sync with `DATA_TABLE_DEFAULT_PAGE_SIZE` in `@villuh/ui`. */
export const LIST_DEFAULT_PAGE_SIZE = 25

/**
 * Server-driven DataTable pagination. Spread into module list schemas:
 * `z.object({ ...listPaginationFields, search: listSearchSchema, ... })`
 */
export const listPaginationFields = {
  /** Zero-based page index. */
  pageIndex: z.number().int().min(0).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
}

/**
 * Full pagination + sorting contract for a paginated list endpoint.
 * `sortKeys` whitelists the sortable columns (frontend column ids); the
 * module's service maps each key to a SQL column via `lib/list-query.ts`.
 *
 * ```ts
 * export const FOO_SORT_KEYS = ['name', 'createdAt'] as const
 * export const listFoosInputSchema = z
 *   .object({ ...listQueryFields(FOO_SORT_KEYS), search: listSearchSchema })
 *   .optional()
 * ```
 */
export function listQueryFields<const K extends readonly [string, ...string[]]>(
  sortKeys: K,
) {
  return {
    ...listPaginationFields,
    sortBy: z.enum(sortKeys).optional(),
    sortDir: listSortDirSchema,
  }
}
