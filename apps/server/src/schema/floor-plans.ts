import { sql } from 'drizzle-orm'
import { integer, numeric, pgPolicy, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { villuhApp } from './rls.js'
import { organization } from './auth.js'
import { properties } from './properties.js'

export const floorPlans = pgTable('floor_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  // 0 is the Studio sentinel; plain integer with an app-enforced 0-20 range (D-08).
  bedrooms: integer('bedrooms').notNull(),
  // JS number (D-07) — verified supported; do NOT copy properties.latitude which omits mode.
  bathrooms: numeric('bathrooms', { precision: 4, scale: 2, mode: 'number' }).notNull(),
  defaultSquareFootage: integer('default_square_footage'),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('floor_plans_property_name_unique').on(t.organizationId, t.propertyId, t.name),
  pgPolicy('organization_isolation', {
    as: 'permissive',
    for: 'all',
    to: villuhApp,
    using: sql`organization_id = current_setting('app.current_organization_id', true)`,
    withCheck: sql`organization_id = current_setting('app.current_organization_id', true)`,
  }),
]).enableRLS()

// Near-copy of propertyImages (D-12): no mutation timestamp, no soft delete. Parent
// property is reached through floor_plan_id — no denormalized property_id (D-13).
export const floorPlanImages = pgTable('floor_plan_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  floorPlanId: uuid('floor_plan_id')
    .notNull()
    .references(() => floorPlans.id, { onDelete: 'cascade' }),
  // Opaque S3 key only — never a URL (project S3 rule). Pre-signed GET URLs generated at read time.
  objectKey: text('object_key').notNull(),
  contentType: text('content_type').notNull(),
  byteLength: integer('byte_length').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, () => [
  pgPolicy('organization_isolation', {
    as: 'permissive',
    for: 'all',
    to: villuhApp,
    using: sql`organization_id = current_setting('app.current_organization_id', true)`,
    withCheck: sql`organization_id = current_setting('app.current_organization_id', true)`,
  }),
]).enableRLS()
