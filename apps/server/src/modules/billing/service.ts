import { eq } from 'drizzle-orm'
import { organization, subscription } from '../../schema/auth.js'
import { withOrganization } from '../../db/index.js'

export interface OrgSubscription {
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_subscription_item_id: string | null
  status: string | null
  plan: string | null
}

export async function getOrgSubscription(orgId: string): Promise<OrgSubscription | null> {
  return withOrganization(orgId, 'system', async (tx) => {
    const rows = await tx
      .select({
        stripe_customer_id: subscription.stripeCustomerId,
        stripe_subscription_id: subscription.stripeSubscriptionId,
        stripe_subscription_item_id: subscription.stripeSubscriptionItemId,
        status: subscription.status,
        plan: subscription.plan,
      })
      .from(subscription)
      .where(eq(subscription.referenceId, orgId))
      .orderBy(subscription.periodEnd)
      .limit(1)
    return rows[0] ?? null
  })
}

export async function syncOrgSubscriptionTier(
  orgId: string,
  tier: string,
  status: string,
): Promise<void> {
  await withOrganization(orgId, 'system', async (tx) => {
    await tx
      .update(organization)
      .set({ subscription_tier: tier, subscription_status: status })
      .where(eq(organization.id, orgId))
  })
}

export async function setOrgSubscriptionStatus(orgId: string, status: string): Promise<void> {
  await withOrganization(orgId, 'system', async (tx) => {
    await tx
      .update(organization)
      .set({ subscription_status: status })
      .where(eq(organization.id, orgId))
  })
}

export async function markSetupCompleted(orgId: string): Promise<void> {
  await withOrganization(orgId, 'system', async (tx) => {
    await tx
      .update(organization)
      .set({ setup_completed: true })
      .where(eq(organization.id, orgId))
  })
}

export async function getOrCreateStripeCustomer(
  stripeClient: import('stripe').default,
  orgId: string,
  ownerEmail: string,
): Promise<string> {
  // Prefer organization_id; also match legacy landlord_id metadata from older writes.
  const existing = await stripeClient.customers.search({
    query: `metadata['organization_id']:'${orgId}' OR metadata['landlord_id']:'${orgId}'`,
    limit: 1,
  })
  if (existing.data.length > 0) return existing.data[0]!.id

  const created = await stripeClient.customers.create({
    email: ownerEmail,
    metadata: { organization_id: orgId },
  })
  return created.id
}

export async function handlePaymentFailed(event: import('stripe').Stripe.Event): Promise<void> {
  const invoice = event.data.object as import('stripe').Stripe.Invoice & {
    subscription_details?: { metadata?: Record<string, string> }
  }
  const meta = invoice.metadata ?? {}
  const subMeta = invoice.subscription_details?.metadata ?? {}
  const orgId =
    meta.organization_id ??
    meta.landlord_id ??
    subMeta.organization_id ??
    subMeta.landlord_id
  if (!orgId) return
  await setOrgSubscriptionStatus(orgId, 'payment_failed')
}
