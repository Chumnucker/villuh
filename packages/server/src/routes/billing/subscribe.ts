import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js'
import { requireTenant } from '../../middleware/require-tenant.js'
import { requirePermission } from '../../middleware/require-permission.js'
import { stripeClient } from '../../auth.js'
import {
  getOrCreateStripeCustomer,
  getOrgSubscription,
  syncOrgSubscriptionTier,
} from '../../lib/billing.js'

const subscribeSchema = z.object({
  tier: z.enum(['starter', 'growth', 'pro']),
  paymentMethodId: z.string(),
  unitCount: z.number().int().min(0).default(0),
})

const PRICE_ENV: Record<string, string> = {
  starter: 'STRIPE_STARTER_PRICE_ID',
  growth: 'STRIPE_GROWTH_PRICE_ID',
  pro: 'STRIPE_PRO_PRICE_ID',
}

export const subscribe = new Hono<{ Variables: AuthVariables }>()
  .post('/', authMiddleware, requirePermission('admin'), zValidator('json', subscribeSchema), async (c) => {
    const { landlordId } = await requireTenant(c)
    const user = c.get('user')!
    const { tier, paymentMethodId, unitCount } = c.req.valid('json')
    const priceId = process.env[PRICE_ENV[tier]!]
    if (!priceId) throw new HTTPException(500, { message: `Missing env ${PRICE_ENV[tier]}` })

    const stripeCustomerId = await getOrCreateStripeCustomer(stripeClient, landlordId, user.email)

    // Attach the PM to the customer and set as default
    await stripeClient.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId })
    await stripeClient.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    // If the customer already has a subscription, update it instead of creating a 2nd
    const existing = await getOrgSubscription(landlordId)
    if (existing?.stripe_subscription_id) {
      const sub = await stripeClient.subscriptions.update(existing.stripe_subscription_id, {
        items: [{ id: existing.stripe_subscription_item_id ?? undefined, price: priceId, quantity: unitCount }],
        default_payment_method: paymentMethodId,
        proration_behavior: 'create_prorations',
        trial_end: 'now',    // exit trial immediately on first paid subscribe
      })
      await syncOrgSubscriptionTier(landlordId, tier, sub.status)
      return c.json({ ok: true, subscriptionId: sub.id, tier, status: sub.status })
    }

    const sub = await stripeClient.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId, quantity: unitCount }],
      default_payment_method: paymentMethodId,
      metadata: { landlord_id: landlordId },
    })
    await syncOrgSubscriptionTier(landlordId, tier, sub.status)
    return c.json({ ok: true, subscriptionId: sub.id, tier, status: sub.status })
  })
