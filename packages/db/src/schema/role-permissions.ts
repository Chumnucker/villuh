import { sql } from 'drizzle-orm'
import { pgPolicy, pgTable, text, uuid, boolean, timestamp, unique } from 'drizzle-orm/pg-core'
import { villuhApp } from './landlords.js'

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  landlordId: uuid('landlord_id').notNull(),
  role: text('role').notNull(),       // 'owner' | 'manager' | 'viewer'
  action: text('action').notNull(),   // 'write' | 'financial' | 'communications' | 'admin'
  allowed: boolean('allowed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('role_permissions_unique').on(t.landlordId, t.role, t.action),
  pgPolicy('tenant_isolation', {
    as: 'permissive',
    for: 'all',
    to: villuhApp,
    using: sql`landlord_id = current_setting('app.current_landlord_id', true)::uuid`,
    withCheck: sql`landlord_id = current_setting('app.current_landlord_id', true)::uuid`,
  }),
]).enableRLS()
