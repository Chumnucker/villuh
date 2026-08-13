import { pgEnum } from 'drizzle-orm/pg-core'
import { ACTION_CATEGORIES } from '../domain/actions.js'
import { PLAN_RESOURCES } from '../domain/billing.js'
import { ROLES } from '../domain/roles.js'
import { PARKING_TYPES, PROPERTY_TYPES } from '../modules/properties/schemas.js'
import { TAG_COLOR_KEYS, TAG_ICON_KEYS } from '../modules/tags/schemas.js'

/**
 * Postgres enum types for the closed option sets this app owns end-to-end.
 * Each is built from the same `as const` array the Zod validators use, so the
 * DB type, the API contract, and the inferred TS types can't drift apart —
 * adding an option is one edit plus a migration.
 *
 * Deliberately NOT enums:
 * - Anything Better Auth or the Stripe plugin writes (`member.role`,
 *   `invitation.status`, `subscription.status/plan`,
 *   `organization.subscription_tier/status`). Those writers are outside our
 *   validation layer and Stripe can emit statuses we don't model, so an enum
 *   would turn an unexpected webhook into a failed write.
 * - `billing_plans.slug` / `plan_limits.tier` — rows, not a fixed set; already
 *   constrained by a foreign key.
 * - `audit_log.operation` — that table lives in raw SQL (partitioned, outside
 *   the Drizzle schema) and already carries a CHECK constraint.
 *
 * Import these leaf modules directly rather than the `domain`/`modules`
 * barrels: the barrels reach into `db/index.js`, which would open a
 * connection just from loading the schema (and cycle back through it).
 */

export const propertyTypeEnum = pgEnum('property_type', PROPERTY_TYPES)
export const parkingTypeEnum = pgEnum('parking_type', PARKING_TYPES)

/** Our own membership roles — distinct from Better Auth's `member.role`. */
export const orgRoleEnum = pgEnum('org_role', ROLES)
export const actionCategoryEnum = pgEnum('action_category', ACTION_CATEGORIES)
export const planResourceEnum = pgEnum('plan_resource', PLAN_RESOURCES)

/** Locked tag/status palette (D-21) — shared by tags and unit statuses. */
export const tagColorEnum = pgEnum('tag_color', TAG_COLOR_KEYS)
export const tagIconEnum = pgEnum('tag_icon', TAG_ICON_KEYS)

/** Tenancy lifecycle (tenant slice). pending → active → ended. */
export const TENANCY_STATUSES = ['pending', 'active', 'ended'] as const
export const tenancyStatusEnum = pgEnum('tenancy_status', TENANCY_STATUSES)
