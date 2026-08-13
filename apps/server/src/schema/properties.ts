import { sql } from 'drizzle-orm'
import { integer, numeric, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { villuhApp } from './rls.js'
import { organization } from './auth.js'
import { parkingTypeEnum, propertyTypeEnum } from './enums.js'

export const properties = pgTable('properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone'),
  notes: text('notes'),
  street: text('street'),
  line2: text('line2'),
  city: text('city'),
  region: text('region'),
  postal: text('postal'),
  country: text('country'),
  // Nullable — only populated for Mapbox-sourced addresses (D-23); manual entry omits these.
  latitude: numeric('latitude', { precision: 9, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),
  propertyType: propertyTypeEnum('property_type'),
  yearBuilt: integer('year_built'),
  parkingType: parkingTypeEnum('parking_type'),
  parkingSpaces: integer('parking_spaces'),
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

// No soft-delete here (D-37) — gallery rows are hard-deleted with the S3 object.
export const propertyImages = pgTable('property_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  // Opaque S3 key only — never a URL (project S3 rule, D-38). Pre-signed GET URLs generated at read time.
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
