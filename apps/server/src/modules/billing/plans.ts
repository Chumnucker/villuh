import { and, asc, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { billingPlans } from '../../schema/billing-plans.js'
import { planLimits } from '../../schema/plan-limits.js'
import { notFound, internalError, TRIAL_TIER } from '../../domain/index.js'

export type BillingPlanRow = typeof billingPlans.$inferSelect

export async function listActivePlans(): Promise<BillingPlanRow[]> {
  return db
    .select()
    .from(billingPlans)
    .where(eq(billingPlans.isActive, true))
    .orderBy(asc(billingPlans.sortOrder))
}

export async function getPlanBySlug(slug: string): Promise<BillingPlanRow | null> {
  const rows = await db
    .select()
    .from(billingPlans)
    .where(and(eq(billingPlans.slug, slug), eq(billingPlans.isActive, true)))
    .limit(1)
  return rows[0] ?? null
}

export async function requirePlanBySlug(slug: string): Promise<BillingPlanRow> {
  const plan = await getPlanBySlug(slug)
  if (!plan) notFound(`Unknown or inactive plan: ${slug}`)
  if (!plan.stripePriceId) {
    internalError(`Plan "${slug}" has no stripe_price_id configured`)
  }
  return plan
}

/**
 * First active plan with trial_days > 0 (typically pro).
 * Does not require stripe_price_id — safe for limit lookups.
 */
export async function findTrialPlan(): Promise<BillingPlanRow> {
  const rows = await db
    .select()
    .from(billingPlans)
    .where(
      and(
        eq(billingPlans.isActive, true),
        isNotNull(billingPlans.trialDays),
        sql`${billingPlans.trialDays} > 0`,
      ),
    )
    .orderBy(asc(billingPlans.sortOrder))
    .limit(1)
  const plan = rows[0]
  if (!plan) notFound('No trial-eligible billing plan configured')
  return plan
}

/** Trial plan for Stripe — requires stripe_price_id. */
export async function getTrialPlan(): Promise<BillingPlanRow> {
  const plan = await findTrialPlan()
  if (!plan.stripePriceId) {
    internalError(`Trial plan "${plan.slug}" has no stripe_price_id configured`)
  }
  return plan
}

export async function getPlanLimitsMap(slug: string): Promise<Record<string, number>> {
  const rows = await db.select().from(planLimits).where(eq(planLimits.tier, slug))
  const limits: Record<string, number> = {}
  for (const r of rows) limits[r.resource] = r.limit
  return limits
}

/** Shape expected by Better Auth Stripe plugin `subscription.plans`. */
export async function loadStripePluginPlans(): Promise<
  Array<{
    name: string
    priceId: string
    limits: Record<string, number>
    freeTrial?: { days: number }
  }>
> {
  const plans = await listActivePlans()
  if (plans.length === 0) {
    throw new Error('[billing] No active billing_plans rows — run migrations')
  }

  const out: Array<{
    name: string
    priceId: string
    limits: Record<string, number>
    freeTrial?: { days: number }
  }> = []

  for (const plan of plans) {
    if (!plan.stripePriceId) {
      console.warn(
        `[billing] Plan "${plan.slug}" missing stripe_price_id — set via migrate hydrate or SQL`,
      )
    }
    const limits = await getPlanLimitsMap(plan.slug)
    out.push({
      name: plan.slug,
      priceId: plan.stripePriceId || `missing_${plan.slug}`,
      limits,
      ...(plan.trialDays != null && plan.trialDays > 0
        ? { freeTrial: { days: plan.trialDays } }
        : {}),
    })
  }

  return out
}

/** Resolve paid tier for limit lookups — trial orgs use the trial plan's limits. */
export async function resolveLimitsTier(orgTier: string): Promise<string> {
  if (orgTier === TRIAL_TIER) {
    const trial = await findTrialPlan()
    return trial.slug
  }
  return orgTier
}
