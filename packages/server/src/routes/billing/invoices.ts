import { Hono } from 'hono'
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js'
import { requireTenant } from '../../middleware/require-tenant.js'
import { requirePermission } from '../../middleware/require-permission.js'
import { stripeClient } from '../../auth.js'
import { getOrgSubscription } from '../../lib/billing.js'

export const invoices = new Hono<{ Variables: AuthVariables }>()
  .get('/', authMiddleware, requirePermission('admin'), async (c) => {
    const { landlordId } = await requireTenant(c)
    const sub = await getOrgSubscription(landlordId)
    if (!sub?.stripe_customer_id) {
      return c.json({ invoices: [] })
    }
    const list = await stripeClient.invoices.list({ customer: sub.stripe_customer_id, limit: 50 })
    return c.json({
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
    })
  })
