import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js'
import { requireTenant } from '../../middleware/require-tenant.js'
import { requirePermission } from '../../middleware/require-permission.js'
import { stripeClient } from '../../auth.js'
import { getOrgSubscription } from '../../lib/billing.js'

const updateSchema = z.object({ paymentMethodId: z.string() })

export const paymentMethod = new Hono<{ Variables: AuthVariables }>()
  .get('/', authMiddleware, requirePermission('admin'), async (c) => {
    const { landlordId } = await requireTenant(c)
    const sub = await getOrgSubscription(landlordId)
    if (!sub?.stripe_customer_id) return c.json({ paymentMethod: null })

    const customer = await stripeClient.customers.retrieve(sub.stripe_customer_id, {
      expand: ['invoice_settings.default_payment_method'],
    })
    if ('deleted' in customer && customer.deleted) return c.json({ paymentMethod: null })
    const pm = (customer as import('stripe').Stripe.Customer).invoice_settings?.default_payment_method
    if (!pm || typeof pm === 'string') return c.json({ paymentMethod: null })
    return c.json({
      paymentMethod: {
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        exp_month: pm.card?.exp_month,
        exp_year: pm.card?.exp_year,
      },
    })
  })
  .put('/', authMiddleware, requirePermission('admin'), zValidator('json', updateSchema), async (c) => {
    const { landlordId } = await requireTenant(c)
    const { paymentMethodId } = c.req.valid('json')
    const sub = await getOrgSubscription(landlordId)
    if (!sub?.stripe_customer_id) return c.json({ error: 'No customer' }, 400)
    await stripeClient.paymentMethods.attach(paymentMethodId, { customer: sub.stripe_customer_id })
    await stripeClient.customers.update(sub.stripe_customer_id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })
    return c.json({ ok: true })
  })
