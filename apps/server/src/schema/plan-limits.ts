import { integer, pgTable, text, uuid, unique } from 'drizzle-orm/pg-core'
import type { PlanResource } from '../domain/index.js'
import { billingPlans } from './billing-plans.js'

// System table — no RLS, no organization scope (system table). Editable by DB admin only (D-40).
// tier FK → billing_plans.slug
export const planLimits = pgTable('plan_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  tier: text('tier').notNull().references(() => billingPlans.slug),
  resource: text('resource').$type<PlanResource>().notNull(),
  limit: integer('limit').notNull(), // -1 means unlimited
}, (t) => [
  unique('plan_limits_unique').on(t.tier, t.resource),
])
