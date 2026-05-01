import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js'
import { requireTenant } from '../../middleware/require-tenant.js'
import { requirePermission } from '../../middleware/require-permission.js'
import { stripeClient } from '../../auth.js'
import {
  getOrCreateStripeCustomer,
  markSetupCompleted,
  syncOrgSubscriptionTier,
  getOrgSubscription,
} from '../../lib/billing.js'

export const trialStart = new Hono<{ Variables: AuthVariables }>()
  .post('/', authMiddleware, requirePermission('admin'), async (c) => {
    const { landlordId } = await requireTenant(c)
    const user = c.get('user')!

    // Idempotency: if org already has an ACTIVE Stripe subscription record, return its state.
    // getOrgSubscription returns null for trial_pending (no row yet) — correctly proceeds to create.
    const existing = await getOrgSubscription(landlordId)
    if (existing?.stripe_subscription_id && existing.status !== 'canceled' && existing.status !== 'incomplete_expired') {
      return c.json({ ok: true, alreadyActive: true, status: existing.status })
    }

    const stripeCustomerId = await getOrCreateStripeCustomer(stripeClient, landlordId, user.email)

    let sub
    try {
      sub = await stripeClient.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 0 }],
        trial_period_days: 30,                                                       // D-19
        trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },     // D-19 (no card required)
        payment_settings: { save_default_payment_method: 'on_subscription' },
        metadata: { landlord_id: landlordId },
      })
    } catch (err) {
      throw new HTTPException(500, { message: `Stripe error: ${(err as Error).message}` })
    }

    // Sync org row immediately: trial_pending → trialing (D-19/D-33/D-39 reconciliation).
    // Better Auth webhook will also fire async — synchronous set avoids race in wizard step 4 navigation.
    await syncOrgSubscriptionTier(landlordId, 'pro', 'trialing')

    // Mark wizard step 4 complete (D-39)
    await markSetupCompleted(landlordId)

    return c.json({
      ok: true,
      subscriptionId: sub.id,
      trialEnd: sub.trial_end,
      tier: 'pro',
      status: 'trialing',
    })
  })
