/**
 * Client-safe Zod input schemas for tRPC procedures.
 * Import from `@villuh/server/schemas/<module>` — never from routers.
 *
 * Not to be confused with `src/schema/` (Drizzle table definitions / DB schema).
 * This folder is only a public export barrel for Zod inputs.
 *
 * Shared DataTable filter primitives: `@villuh/server/schemas/filters`
 * (do not re-export here — keeps Next client bundles free of relative `.js` hops).
 *
 * `me` has no inputs today (query-only).
 */
export * from '../modules/account/schemas.js'
export * from '../modules/members/schemas.js'
export * from '../modules/permissions/schemas.js'
export * from '../modules/billing/schemas.js'
export * from '../modules/audit-log/schemas.js'
export * from '../modules/tenants/schemas.js'
// `members` and `tenants` both export `removeMemberInputSchema`/`RemoveMemberInput`.
// Disambiguate the wildcard barrel toward the pre-existing `members` owner; the tenant
// variant is reached via its module path (`@villuh/server/schemas/tenants`) per convention.
export { removeMemberInputSchema, type RemoveMemberInput } from '../modules/members/schemas.js'
