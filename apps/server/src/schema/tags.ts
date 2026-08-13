import { sql } from 'drizzle-orm'
import { pgPolicy, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { villuhApp } from './rls.js'
import { organization } from './auth.js'
import { properties } from './properties.js'
import { tagColorEnum, tagIconEnum } from './enums.js'

// Org catalog tags — promoted from freeform property_tag rows (D-17-D-18).
export const organizationTag = pgTable('organization_tag', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  iconKey: tagIconEnum('icon_key').notNull(),
  colorKey: tagColorEnum('color_key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('organization_tag_org_name_unique').on(t.organizationId, t.name),
  pgPolicy('organization_isolation', {
    as: 'permissive',
    for: 'all',
    to: villuhApp,
    using: sql`organization_id = current_setting('app.current_organization_id', true)`,
    withCheck: sql`organization_id = current_setting('app.current_organization_id', true)`,
  }),
]).enableRLS()

// Assignment rows: freeform (organizationTagId null) or catalog-backed. label/icon/color are
// always denormalized so display never depends on a join, and freeform tags render identically
// to promoted ones (Pattern 7).
export const propertyTag = pgTable('property_tag', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  organizationTagId: uuid('organization_tag_id').references(() => organizationTag.id, { onDelete: 'set null' }),
  label: text('label').notNull(),
  iconKey: tagIconEnum('icon_key').notNull(),
  colorKey: tagColorEnum('color_key').notNull(),
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
