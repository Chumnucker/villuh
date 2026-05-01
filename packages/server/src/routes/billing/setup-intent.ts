import { Hono } from 'hono'
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js'
import { requireTenant } from '../../middleware/require-tenant.js'
import { requirePermission } from '../../middleware/require-permission.js'
import { stripeClient } from '../../auth.js'
import { getOrCreateStripeCustomer } from '../../lib/billing.js'

export const setupIntent = new Hono<{ Variables: AuthVariables }>()
  .post('/', authMiddleware, requirePermission('admin'), async (c) => {
    const { landlordId } = await requireTenant(c)
    const user = c.get('user')!
    const stripeCustomerId = await getOrCreateStripeCustomer(stripeClient, landlordId, user.email)

    const intent = await stripeClient.setupIntents.create({
      customer: stripeCustomerId,
      automatic_payment_methods: { enabled: true },
      metadata: { landlord_id: landlordId },
    })
    return c.json({ clientSecret: intent.client_secret })
  })
