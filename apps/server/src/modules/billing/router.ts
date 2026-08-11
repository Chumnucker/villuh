import { router, permissionProcedure, protectedProcedure } from '../../trpc.js'
import { stripeClient } from '../auth/index.js'
import {
  getOrCreateStripeCustomer,
  markSetupCompleted,
  syncOrgSubscriptionTier,
  getOrgSubscription,
} from './service.js'
import { getTrialPlan, listActivePlans, requirePlanBySlug } from './plans.js'
import { internalError, badRequest } from '../../domain/index.js'
import { syncOrgUnitQuantity } from '../../domain/billing-sync.js'
import {
  subscribeInputSchema,
  upgradeInputSchema,
  updatePaymentMethodInputSchema,
  syncUnitsInputSchema,
} from './schemas.js'

export const billingRouter = router({
  listPlans: protectedProcedure.query(async () => {
    const plans = await listActivePlans()
    return {
      plans: plans.map((p) => ({
        slug: p.slug,
        name: p.name,
        trialDays: p.trialDays,
        sortOrder: p.sortOrder,
        // Never expose raw Stripe price IDs to the client unless needed for Checkout —
        // subscribe/upgrade resolve price server-side from slug.
        hasPrice: Boolean(p.stripePriceId),
      })),
    }
  }),

  trialStart: permissionProcedure('admin').mutation(async ({ ctx }) => {
    const { organizationId, user } = ctx

    const existing = await getOrgSubscription(organizationId)
    if (
      existing?.stripe_subscription_id &&
      existing.status !== 'canceled' &&
      existing.status !== 'incomplete_expired'
    ) {
      return { ok: true, alreadyActive: true, status: existing.status }
    }

    const trialPlan = await getTrialPlan()
    const stripeCustomerId = await getOrCreateStripeCustomer(stripeClient, organizationId, user.email)

    let sub
    try {
      sub = await stripeClient.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: trialPlan.stripePriceId, quantity: 0 }],
        trial_period_days: trialPlan.trialDays!,
        trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
        payment_settings: { save_default_payment_method: 'on_subscription' },
        metadata: { organization_id: organizationId },
      })
    } catch (err) {
      internalError(`Stripe error: ${(err as Error).message}`)
    }

    await syncOrgSubscriptionTier(organizationId, trialPlan.slug, 'trialing')
    await markSetupCompleted(organizationId)

    return {
      ok: true,
      subscriptionId: sub.id,
      trialEnd: sub.trial_end,
      tier: trialPlan.slug,
      status: 'trialing' as const,
    }
  }),

  createSetupIntent: permissionProcedure('admin').mutation(async ({ ctx }) => {
    const { organizationId, user } = ctx
    const stripeCustomerId = await getOrCreateStripeCustomer(stripeClient, organizationId, user.email)

    const intent = await stripeClient.setupIntents.create({
      customer: stripeCustomerId,
      automatic_payment_methods: { enabled: true },
      metadata: { organization_id: organizationId },
    })
    return { clientSecret: intent.client_secret }
  }),

  subscribe: permissionProcedure('admin')
    .input(subscribeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, user } = ctx
      const { tier, paymentMethodId, unitCount } = input
      const plan = await requirePlanBySlug(tier)
      const priceId = plan.stripePriceId

      const stripeCustomerId = await getOrCreateStripeCustomer(stripeClient, organizationId, user.email)

      await stripeClient.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId })
      await stripeClient.customers.update(stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      })

      const existing = await getOrgSubscription(organizationId)
      if (existing?.stripe_subscription_id) {
        const sub = await stripeClient.subscriptions.update(existing.stripe_subscription_id, {
          items: [{ id: existing.stripe_subscription_item_id ?? undefined, price: priceId, quantity: unitCount }],
          default_payment_method: paymentMethodId,
          proration_behavior: 'create_prorations',
          trial_end: 'now',
        })
        await syncOrgSubscriptionTier(organizationId, tier, sub.status)
        return { ok: true, subscriptionId: sub.id, tier, status: sub.status }
      }

      const sub = await stripeClient.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId, quantity: unitCount }],
        default_payment_method: paymentMethodId,
        metadata: { organization_id: organizationId },
      })
      await syncOrgSubscriptionTier(organizationId, tier, sub.status)
      return { ok: true, subscriptionId: sub.id, tier, status: sub.status }
    }),

  upgrade: permissionProcedure('admin')
    .input(upgradeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx
      const { tier } = input
      const plan = await requirePlanBySlug(tier)
      const priceId = plan.stripePriceId

      const existing = await getOrgSubscription(organizationId)
      if (!existing?.stripe_subscription_id) {
        badRequest('No active subscription. Use billing.subscribe instead.')
      }

      const sub = await stripeClient.subscriptions.update(existing.stripe_subscription_id, {
        items: [{ id: existing.stripe_subscription_item_id ?? undefined, price: priceId }],
        proration_behavior: 'create_prorations',
      })
      await syncOrgSubscriptionTier(organizationId, tier, sub.status)
      return { ok: true, tier, status: sub.status }
    }),

  getInvoices: permissionProcedure('admin').query(async ({ ctx }) => {
    const { organizationId } = ctx
    const sub = await getOrgSubscription(organizationId)
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
    const { organizationId } = ctx
    const sub = await getOrgSubscription(organizationId)
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
    .input(updatePaymentMethodInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx
      const { paymentMethodId } = input
      const sub = await getOrgSubscription(organizationId)
      if (!sub?.stripe_customer_id) {
        badRequest('No customer')
      }
      await stripeClient.paymentMethods.attach(paymentMethodId, { customer: sub.stripe_customer_id })
      await stripeClient.customers.update(sub.stripe_customer_id, {
        invoice_settings: { default_payment_method: paymentMethodId },
      })
      return { ok: true }
    }),

  // Delegates to domain/billing-sync.ts (Pattern 8) — same helper units.create/archive and
  // properties.archive (cascade) call directly, without a tRPC-to-tRPC call.
  syncUnits: permissionProcedure('write')
    .input(syncUnitsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx
      return syncOrgUnitQuantity(organizationId, input.unitCount)
    }),
})
