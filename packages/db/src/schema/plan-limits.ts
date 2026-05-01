import { integer, pgTable, text, uuid, unique } from 'drizzle-orm/pg-core'

// System table — no RLS, no landlord_id column. Editable by DB admin only (D-40).
export const planLimits = pgTable('plan_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  tier: text('tier').notNull(),         // 'starter' | 'growth' | 'pro'
  resource: text('resource').notNull(), // 'units' | 'properties' | 'members'
  limit: integer('limit').notNull(),    // -1 means unlimited
}, (t) => [
  unique('plan_limits_unique').on(t.tier, t.resource),
])
