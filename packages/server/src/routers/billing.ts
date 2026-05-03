import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, permissionProcedure } from '../trpc.js'
import { stripeClient } from '../auth.js'
import {
  getOrCreateStripeCustomer,
  markSetupCompleted,
  syncOrgSubscriptionTier,
  getOrgSubscription,
  setOrgSubscriptionStatus,
} from '../lib/billing.js'

const PRICE_ENV: Record<string, string> = {
  starter: 'STRIPE_STARTER_PRICE_ID',
  growth: 'STRIPE_GROWTH_PRICE_ID',
  pro: 'STRIPE_PRO_PRICE_ID',
}

export const billingRouter = router({
  trialStart: permissionProcedure('admin').mutation(async ({ ctx }) => {
    const { landlordId, user } = ctx

    // Idempotency: if org already has an ACTIVE Stripe subscription record, return its state.
    const existing = await getOrgSubscription(landlordId)
    if (
      existing?.stripe_subscription_id &&
      existing.status !== 'canceled' &&
      existing.status !== 'incomplete_expired'
    ) {
      return { ok: true, alreadyActive: true, status: existing.status }
    }

    const stripeCustomerId = await getOrCreateStripeCustomer(stripeClient, landlordId, user.email)

    let sub
    try {
      sub = await stripeClient.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 0 }],
        trial_period_days: 30,                                                        // D-19
        trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },      // D-19 (no card required)
        payment_settings: { save_default_payment_method: 'on_subscription' },
        metadata: { landlord_id: landlordId },
      })
    } catch (err) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Stripe error: ${(err as Error).message}` })
    }

    // Sync org row immediately: trial_pending → trialing (D-19/D-33/D-39 reconciliation)
    await syncOrgSubscriptionTier(landlordId, 'pro', 'trialing')

    // Mark wizard step 4 complete (D-39)
    await markSetupCompleted(landlordId)

    return {
      ok: true,
      subscriptionId: sub.id,
      trialEnd: sub.trial_end,
      tier: 'pro',
      status: 'trialing',
    }
  }),

  createSetupIntent: permissionProcedure('admin').mutation(async ({ ctx }) => {
    const { landlordId, user } = ctx
    const stripeCustomerId = await getOrCreateStripeCustomer(stripeClient, landlordId, user.email)

    const intent = await stripeClient.setupIntents.create({
      customer: stripeCustomerId,
      automatic_payment_methods: { enabled: true },
      metadata: { landlord_id: landlordId },
    })
    return { clientSecret: intent.client_secret }
  }),

  subscribe: permissionProcedure('admin')
    .input(z.object({
      tier: z.enum(['starter', 'growth', 'pro']),
      paymentMethodId: z.string(),
      unitCount: z.number().int().min(0).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const { landlordId, user } = ctx
      const { tier, paymentMethodId, unitCount } = input
      const priceId = process.env[PRICE_ENV[tier]!]
      if (!priceId) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Missing env ${PRICE_ENV[tier]}` })
      }

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
          trial_end: 'now', // exit trial immediately on first paid subscribe
        })
        await syncOrgSubscriptionTier(landlordId, tier, sub.status)
        return { ok: true, subscriptionId: sub.id, tier, status: sub.status }
      }

      const sub = await stripeClient.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId, quantity: unitCount }],
        default_payment_method: paymentMethodId,
        metadata: { landlord_id: landlordId },
      })
      await syncOrgSubscriptionTier(landlordId, tier, sub.status)
      return { ok: true, subscriptionId: sub.id, tier, status: sub.status }
    }),

  upgrade: permissionProcedure('admin')
    .input(z.object({ tier: z.enum(['starter', 'growth', 'pro']) }))
    .mutation(async ({ ctx, input }) => {
      const { landlordId } = ctx
      const { tier } = input
      const priceId = process.env[PRICE_ENV[tier]!]
      if (!priceId) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Missing env ${PRICE_ENV[tier]}` })
      }

      const existing = await getOrgSubscription(landlordId)
      if (!existing?.stripe_subscription_id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No active subscription. Use billing.subscribe instead.' })
      }

      const sub = await stripeClient.subscriptions.update(existing.stripe_subscription_id, {
        items: [{ id: existing.stripe_subscription_item_id ?? undefined, price: priceId }],
        proration_behavior: 'create_prorations',
      })
      await syncOrgSubscriptionTier(landlordId, tier, sub.status)
      return { ok: true, tier, status: sub.status }
    }),

  getInvoices: permissionProcedure('admin').query(async ({ ctx }) => {
    const { landlordId } = ctx
    const sub = await getOrgSubscription(landlordId)
    if (!sub?.stripe_customer_id) {
      return { invoices: [] }
    }
    const list = await stripeClient.invoices.list({ customer: sub.stripe_customer_id, limit: 50 })
    return {
      invoices: list.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        amount_paid: inv.amount_paid,
        amount_due: inv.amount_due,
        currency: inv.currency,
        status: inv.status,
        created: inv.created,
        due_date: inv.due_date,
        hosted_invoice_url: inv.hosted_invoice_url,
        invoice_pdf: inv.invoice_pdf,
      })),
    }
  }),

  getPaymentMethod: permissionProcedure('admin').query(async ({ ctx }) => {
    const { landlordId } = ctx
    const sub = await getOrgSubscription(landlordId)
    if (!sub?.stripe_customer_id) return { paymentMethod: null }

    const customer = await stripeClient.customers.retrieve(sub.stripe_customer_id, {
      expand: ['invoice_settings.default_payment_method'],
    })
    if ('deleted' in customer && customer.deleted) return { paymentMethod: null }
    const pm = (customer as import('stripe').Stripe.Customer).invoice_settings?.default_payment_method
    if (!pm || typeof pm === 'string') return { paymentMethod: null }
    return {
      paymentMethod: {
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        exp_month: pm.card?.exp_month,
        exp_year: pm.card?.exp_year,
      },
    }
  }),

  updatePaymentMethod: permissionProcedure('admin')
    .input(z.object({ paymentMethodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { landlordId } = ctx
      const { paymentMethodId } = input
      const sub = await getOrgSubscription(landlordId)
      if (!sub?.stripe_customer_id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No customer' })
      }
      await stripeClient.paymentMethods.attach(paymentMethodId, { customer: sub.stripe_customer_id })
      await stripeClient.customers.update(sub.stripe_customer_id, {
        invoice_settings: { default_payment_method: paymentMethodId },
      })
      return { ok: true }
    }),

  syncUnits: permissionProcedure('write')
    .input(z.object({ unitCount: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      const { landlordId } = ctx
      const { unitCount } = input

      const existing = await getOrgSubscription(landlordId)
      if (!existing?.stripe_subscription_id || !existing?.stripe_subscription_item_id) {
        // No subscription yet — soft-skip (e.g. during trial when quantity=0 doesn't bill)
        return { ok: true, skipped: true, reason: 'no_subscription' }
      }

      const sub = await stripeClient.subscriptions.update(existing.stripe_subscription_id, {
        items: [{ id: existing.stripe_subscription_item_id, quantity: unitCount }],
        proration_behavior: 'create_prorations', // D-21 implicit
      })
      return { ok: true, quantity: unitCount, status: sub.status }
    }),
})

// Re-export setOrgSubscriptionStatus for use in billing event handlers
export { setOrgSubscriptionStatus }
