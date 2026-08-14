import { sql } from 'drizzle-orm'
import { boolean, integer, pgPolicy, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { organization } from './auth.js'
import { amenityIconEnum, amenityScopeEnum, tagColorEnum } from './enums.js'
import { properties } from './properties.js'
import { villuhApp } from './rls.js'
import { units } from './units.js'

// Org catalog amenities (D-17). One catalog with scope property|unit|both (D-02).
// Reservations are NOT modeled here (D-01/D-05 — is_reservable lives on property_amenity).
export const organizationAmenity = pgTable('organization_amenity', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  scope: amenityScopeEnum('scope').notNull(),
  // Icon/color are NOT NULL with defaults, never nullable (D-12).
  iconKey: amenityIconEnum('icon_key').notNull().default('IconStar'),
  colorKey: tagColorEnum('color_key').notNull().default('slate'),
  isSystem: boolean('is_system').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('organization_amenity_org_name_unique').on(t.organizationId, t.name),
  pgPolicy('organization_isolation', {
    as: 'permissive',
    for: 'all',
    to: villuhApp,
    using: sql`organization_id = current_setting('app.current_organization_id', true)`,
    withCheck: sql`organization_id = current_setting('app.current_organization_id', true)`,
  }),
]).enableRLS()

// Property assignment (D-21): freeform (organizationAmenityId null) or catalog-backed.
// label/icon/color are always denormalized so display never depends on a join, and the
// is_reservable / requires_approval config columns are inert this phase (D-05). The partial
// unique index (D-22) is not expressible in Drizzle — it lives in the migration only.
export const propertyAmenity = pgTable('property_amenity', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  organizationAmenityId: uuid('organization_amenity_id').references(() => organizationAmenity.id, { onDelete: 'set null' }),
  label: text('label').notNull(),
  description: text('description'),
  iconKey: amenityIconEnum('icon_key').notNull().default('IconStar'),
  colorKey: tagColorEnum('color_key').notNull().default('slate'),
  isReservable: boolean('is_reservable').notNull().default(false),
  requiresApproval: boolean('requires_approval').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
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

// Unit assignment (D-24) — deliberately thin: no description/updatedAt/sortOrder/reservability/gallery.
// The partial unique index (D-24) lives in the migration only.
export const unitAmenity = pgTable('unit_amenity', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  unitId: uuid('unit_id')
    .notNull()
    .references(() => units.id, { onDelete: 'cascade' }),
  organizationAmenityId: uuid('organization_amenity_id').references(() => organizationAmenity.id, { onDelete: 'set null' }),
  label: text('label').notNull(),
  iconKey: amenityIconEnum('icon_key').notNull().default('IconStar'),
  colorKey: tagColorEnum('color_key').notNull().default('slate'),
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

// Property amenity gallery (D-25). Mirrors floorPlanImages: objectKey/contentType/byteLength/
// sortOrder/createdAt, cascade FK, NO updatedAt / soft delete. S3 objectKey only (project rule).
export const propertyAmenityImage = pgTable('property_amenity_image', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  propertyAmenityId: uuid('property_amenity_id')
    .notNull()
    .references(() => propertyAmenity.id, { onDelete: 'cascade' }),
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
