import { sql } from 'drizzle-orm'
import { boolean, date, pgPolicy, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { villuhApp } from './rls.js'
import { organization } from './auth.js'
import { units } from './units.js'
import { tenancyStatusEnum } from './enums.js'

const orgIsolation = pgPolicy('organization_isolation', {
  as: 'permissive',
  for: 'all',
  to: villuhApp,
  using: sql`organization_id = current_setting('app.current_organization_id', true)`,
  withCheck: sql`organization_id = current_setting('app.current_organization_id', true)`,
})

/** Reusable person record. A tenant may recur across tenancies over time (UNIT-04). */
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  notes: text('notes'),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, () => [orgIsolation]).enableRLS()

/** Occupancy grouping. The future Lease entity extends this row (no re-plumbing). */
export const tenancies = pgTable('tenancies', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  unitId: uuid('unit_id').notNull().references(() => units.id, { onDelete: 'cascade' }),
  status: tenancyStatusEnum('status').notNull().default('pending'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, () => [orgIsolation]).enableRLS()

/** Co-tenant join. One primary per tenancy; unique (tenancy, tenant). */
export const tenancyMembers = pgTable('tenancy_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  tenancyId: uuid('tenancy_id').notNull().references(() => tenancies.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('tenancy_members_tenancy_tenant_unique').on(t.tenancyId, t.tenantId),
  orgIsolation,
]).enableRLS()
