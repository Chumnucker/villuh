import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js'
import { requireTenant } from '../../middleware/require-tenant.js'
import { requirePermission } from '../../middleware/require-permission.js'
import { stripeClient } from '../../auth.js'
import { getOrgSubscription, syncOrgSubscriptionTier } from '../../lib/billing.js'

const upgradeSchema = z.object({ tier: z.enum(['starter', 'growth', 'pro']) })

const PRICE_ENV: Record<string, string> = {
  starter: 'STRIPE_STARTER_PRICE_ID',
  growth: 'STRIPE_GROWTH_PRICE_ID',
  pro: 'STRIPE_PRO_PRICE_ID',
}

export const upgrade = new Hono<{ Variables: AuthVariables }>()
  .post('/', authMiddleware, requirePermission('admin'), zValidator('json', upgradeSchema), async (c) => {
    const { landlordId } = await requireTenant(c)
    const { tier } = c.req.valid('json')
    const priceId = process.env[PRICE_ENV[tier]!]
    if (!priceId) throw new HTTPException(500, { message: `Missing env ${PRICE_ENV[tier]}` })

    const existing = await getOrgSubscription(landlordId)
    if (!existing?.stripe_subscription_id) {
      throw new HTTPException(400, { message: 'No active subscription. Use /api/billing/subscribe instead.' })
    }

    const sub = await stripeClient.subscriptions.update(existing.stripe_subscription_id, {
      items: [{ id: existing.stripe_subscription_item_id ?? undefined, price: priceId }],
      proration_behavior: 'create_prorations',
    })
    await syncOrgSubscriptionTier(landlordId, tier, sub.status)
    return c.json({ ok: true, tier, status: sub.status })
  })
