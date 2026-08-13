import { sql } from 'drizzle-orm'
import { pgPolicy, pgRole, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// Mark villuh_app as an EXISTING role — Drizzle should not try to CREATE it.
// The role is created by bootstrap-db.sql (run once by a superuser before migrations).
export const villuhApp = pgRole('villuh_app').existing()

/**
 * Demonstration table for RLS + audit log integration test.
 * Organization-scoped tables follow this pattern:
 * - organization_id NOT NULL (Better Auth organization.id)
 * - pgPolicy using current_setting('app.current_organization_id', true)
 * - RLS enabled via .enableRLS()
 */
export const testOrganizationData = pgTable('test_organization_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull(),
  data: text('data'),
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
