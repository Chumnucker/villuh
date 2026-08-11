import { sql } from 'drizzle-orm'
import { pgPolicy, pgTable, text, uuid, boolean, timestamp, unique } from 'drizzle-orm/pg-core'
import { villuhApp } from './rls.js'
import { organization } from './auth.js'
import type { ActionCategory, Role } from '../domain/index.js'

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  role: text('role').$type<Role>().notNull(),
  action: text('action').$type<ActionCategory>().notNull(),
  allowed: boolean('allowed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('role_permissions_org_role_action_unique').on(t.organizationId, t.role, t.action),
  pgPolicy('organization_isolation', {
    as: 'permissive',
    for: 'all',
    to: villuhApp,
    using: sql`organization_id = current_setting('app.current_organization_id', true)`,
    withCheck: sql`organization_id = current_setting('app.current_organization_id', true)`,
  }),
]).enableRLS()
