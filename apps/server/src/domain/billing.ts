import { z } from 'zod'

/**
 * Org-row sentinel before a paid plan is selected.
 * Not a `billing_plans.slug` — trial limits resolve via the plan with trial_days.
 */
export const TRIAL_TIER = 'trial' as const

export const SUBSCRIPTION_STATUSES = [
  'trial_pending',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'expired',
  'payment_failed',
  'incomplete',
  'incomplete_expired',
] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export const PLAN_RESOURCES = ['units', 'properties', 'members'] as const
export type PlanResource = (typeof PLAN_RESOURCES)[number]

/** Paid plan slug input — existence checked against billing_plans at call time. */
export const zPlanSlug = z.string().min(1)
