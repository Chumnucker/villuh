import { boolean, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'

/**
 * System table — no RLS, no organization_id.
 * Canonical paid plans (slug, Stripe price, trial). Limits live in plan_limits.
 */
export const billingPlans = pgTable('billing_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  stripePriceId: text('stripe_price_id').notNull(),
  /** Null = no free trial on this plan. */
  trialDays: integer('trial_days'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
})
