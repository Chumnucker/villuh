import { and, eq } from 'drizzle-orm'
import { organization } from '../schema/auth.js'
import { planLimits } from '../schema/plan-limits.js'
import { forbidden } from './errors.js'
import type { PlanResource } from './billing.js'
import { resolveLimitsTier } from '../modules/billing/plans.js'
import type { OrganizationTx } from '../db/index.js'

/**
 * Enforce a `plan_limits` quota for a resolved-tier resource. Mirrors the inline
 * check in members/router.ts (Pattern 2) — throws `forbidden(..., 'PLAN_LIMIT', meta)`
 * when the org's resolved tier limit is reached. Callers supply `current` via the
 * matching countActive* helper so archived rows never count (Pitfall 2).
 */
export async function assertPlanLimit(opts: {
  tx: OrganizationTx
  organizationId: string
  resource: PlanResource
  current: number
}): Promise<void> {
  const { tx, organizationId, resource, current } = opts

  const orgRows = await tx
    .select()
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)
  const tier = orgRows[0]?.subscription_tier ?? 'trial'
  const lookupTier = await resolveLimitsTier(tier)

  const limitRows = await tx
    .select()
    .from(planLimits)
    .where(and(eq(planLimits.tier, lookupTier), eq(planLimits.resource, resource)))
    .limit(1)
  const limit = limitRows[0]?.limit ?? -1

  if (limit !== -1 && current >= limit) {
    forbidden(`${resource} plan limit reached`, 'PLAN_LIMIT', {
      resource,
      limit,
      current,
      upgrade_to: tier === 'starter' ? 'growth' : 'pro',
    })
  }
}
