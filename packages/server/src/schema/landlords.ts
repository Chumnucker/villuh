import { sql } from 'drizzle-orm'
import { pgPolicy, pgRole, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// Mark villuh_app as an EXISTING role — Drizzle should not try to CREATE it.
// The role is created by bootstrap-db.sql (run once by a superuser before migrations).
export const villuhApp = pgRole('villuh_app').existing()

/**
 * Demonstration table for RLS + audit log integration test.
 * Every table that holds tenant data follows this pattern:
 * - landlord_id NOT NULL column
 * - pgPolicy using current_setting('app.current_landlord_id', true)::uuid
 * - RLS enabled via .enableRLS() on the table
 *
 * 'landlords' itself does NOT get RLS (bootstrap paradox — can't filter on itself).
 */
export const testTenantData = pgTable('test_tenant_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  landlordId: uuid('landlord_id').notNull(),
  data: text('data'),
  // drizzle-orm 0.45.2: timestamp() with { withTimezone: true } produces TIMESTAMPTZ
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  pgPolicy('tenant_isolation', {
    as: 'permissive',
    for: 'all',
    to: villuhApp,
    using: sql`landlord_id = current_setting('app.current_landlord_id', true)::uuid`,
    withCheck: sql`landlord_id = current_setting('app.current_landlord_id', true)::uuid`,
  }),
]).enableRLS()
