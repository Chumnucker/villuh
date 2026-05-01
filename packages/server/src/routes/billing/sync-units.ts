import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js'
import { requireTenant } from '../../middleware/require-tenant.js'
import { requirePermission } from '../../middleware/require-permission.js'
import { stripeClient } from '../../auth.js'
import { getOrgSubscription } from '../../lib/billing.js'

const syncSchema = z.object({ unitCount: z.number().int().min(0) })

export const syncUnits = new Hono<{ Variables: AuthVariables }>()
  .post('/', authMiddleware, requirePermission('write'), zValidator('json', syncSchema), async (c) => {
    const { landlordId } = await requireTenant(c)
    const { unitCount } = c.req.valid('json')

    const existing = await getOrgSubscription(landlordId)
    if (!existing?.stripe_subscription_id || !existing?.stripe_subscription_item_id) {
      // No subscription yet — soft-skip (e.g. during trial when quantity=0 doesn't bill).
      return c.json({ ok: true, skipped: true, reason: 'no_subscription' })
    }

    const sub = await stripeClient.subscriptions.update(existing.stripe_subscription_id, {
      items: [{ id: existing.stripe_subscription_item_id, quantity: unitCount }],
      proration_behavior: 'create_prorations',   // D-21 implicit
    })
    return c.json({ ok: true, quantity: unitCount, status: sub.status })
  })
