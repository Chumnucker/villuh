import { sql } from 'drizzle-orm'
import { pgPolicy, pgTable, text, uuid, boolean, timestamp, unique } from 'drizzle-orm/pg-core'
import { villuhApp } from './landlords.js'

// NOTE: landlord_id is text (not uuid) because Better Auth organization IDs are generated
// as random text strings (e.g. "gOd2RxeLcJfxvwmjZceIxqeult0stA5x"), not UUID v4 format.
// When using crypto.randomUUID() in Better Auth's advanced.generateId, they ARE UUIDs,
// but the column type stays text for forward compatibility with any ID strategy.
// The RLS policy compares text to text (no ::uuid cast needed).
export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  landlordId: text('landlord_id').notNull(),
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
    // Compare as text (no ::uuid cast) — landlord_id is text type
    using: sql`landlord_id = current_setting('app.current_landlord_id', true)`,
    withCheck: sql`landlord_id = current_setting('app.current_landlord_id', true)`,
  }),
]).enableRLS()
