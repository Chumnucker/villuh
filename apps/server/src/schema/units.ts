import { sql } from 'drizzle-orm'
import { boolean, integer, numeric, pgPolicy, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { villuhApp } from './rls.js'
import { organization } from './auth.js'
import { properties } from './properties.js'
import { floorPlans } from './floor-plans.js'
import { tagColorEnum, tagIconEnum } from './enums.js'

// Org-defined status catalog (D-26-D-29). Seeded via ensureDefaultUnitStatuses (Pattern 6).
export const unitStatuses = pgTable('unit_statuses', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  // Same locked palette as tags — the status catalog is org-defined by *name*,
  // not by icon/color (D-26-D-29).
  iconKey: tagIconEnum('icon_key').notNull(),
  colorKey: tagColorEnum('color_key').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  // System-seeded defaults (Available/Occupied/Maintenance) vs landlord-created custom statuses.
  isSystem: boolean('is_system').notNull().default(false),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('unit_statuses_org_name_unique').on(t.organizationId, t.name),
  pgPolicy('organization_isolation', {
    as: 'permissive',
    for: 'all',
    to: villuhApp,
    using: sql`organization_id = current_setting('app.current_organization_id', true)`,
    withCheck: sql`organization_id = current_setting('app.current_organization_id', true)`,
  }),
]).enableRLS()

export const units = pgTable('units', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  squareFootage: integer('square_footage'),
  // Integer cents (A3) — never float dollars.
  baseRent: integer('base_rent').notNull().default(0),
  // Manual assignment in Phase 3 (D-28); Phase 4 will auto-set Occupied when a lease is active.
  statusId: uuid('status_id').references(() => unitStatuses.id, { onDelete: 'set null' }),
  // Nullable floor-plan link (D-17). Thunked reference avoids the import cycle (RESEARCH Pitfall 5).
  floorPlanId: uuid('floor_plan_id').references(() => floorPlans.id, { onDelete: 'set null' }),
  bedrooms: integer('bedrooms'),
  bathrooms: numeric('bathrooms', { precision: 4, scale: 2, mode: 'number' }),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, () => [
  pgPolicy('organization_isolation', {
    as: 'permissive',
    for: 'all',
    to: villuhApp,
    using: sql`organization_id = current_setting('app.current_organization_id', true)`,
    withCheck: sql`organization_id = current_setting('app.current_organization_id', true)`,
  }),
]).enableRLS()
