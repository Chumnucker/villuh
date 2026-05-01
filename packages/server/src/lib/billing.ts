import { organization } from '@villuh/db/schema/auth'
import { eq } from 'drizzle-orm'
import { withTenant } from './tenant.js'

/**
 * Sync subscription_tier + subscription_status on the org row.
 * Called from Better Auth Stripe plugin onSubscriptionCreated and onSubscriptionUpdate.
 * referenceId = organization.id (Better Auth Stripe plugin convention when organization billing is enabled).
 */
export async function syncOrgSubscriptionTier(
  orgId: string,
  tier: string,    // 'starter' | 'growth' | 'pro' | 'trial'
  status: string   // 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'payment_failed'
): Promise<void> {
  await withTenant(orgId, 'system', async (tx) => {
    await tx
      .update(organization)
      .set({ subscription_tier: tier, subscription_status: status })
      .where(eq(organization.id, orgId))
  })
}

/**
 * Set only the subscription_status column.
 * Used by onSubscriptionDeleted (status = 'expired') and onEvent invoice.payment_failed.
 */
export async function setOrgSubscriptionStatus(orgId: string, status: string): Promise<void> {
  await withTenant(orgId, 'system', async (tx) => {
    await tx
      .update(organization)
      .set({ subscription_status: status })
      .where(eq(organization.id, orgId))
  })
}

/**
 * Mark setup_completed = true on the org row. Called by /api/billing/trial-start once trial is created (Plan 06 wires this from wizard step 4).
 */
export async function markSetupCompleted(orgId: string): Promise<void> {
  await withTenant(orgId, 'system', async (tx) => {
    await tx
      .update(organization)
      .set({ setup_completed: true })
      .where(eq(organization.id, orgId))
  })
}

/**
 * Stripe customer creation helper used by Plan 05 trial-start route.
 * Returns existing customer ID if Better Auth Stripe plugin already created one.
 * Otherwise creates a new customer and returns the ID.
 *
 * Note: Better Auth Stripe plugin with createCustomerOnSignUp=false leaves customer creation to us;
 * Plan 05 will create the customer immediately before calling stripe.subscriptions.create().
 */
export async function getOrCreateStripeCustomer(
  stripeClient: import('stripe').default,
  orgId: string,
  ownerEmail: string
): Promise<string> {
  // Search by metadata.landlord_id then create if missing.
  const existing = await stripeClient.customers.search({
    query: `metadata['landlord_id']:'${orgId}'`,
    limit: 1,
  })
  if (existing.data.length > 0) return existing.data[0]!.id

  const created = await stripeClient.customers.create({
    email: ownerEmail,
    metadata: { landlord_id: orgId },
  })
  return created.id
}

/**
 * Handle invoice.payment_failed Stripe event.
 * Per D-22: notify landlord in-app + start grace period. Phase 2 hard-blocks on expired;
 * for now, set subscription_status = 'payment_failed' which the gate middleware does NOT block on (only 'expired' blocks).
 * The gate behavior is finalized in Plan 06.
 */
export async function handlePaymentFailed(event: import('stripe').Stripe.Event): Promise<void> {
  const invoice = event.data.object as import('stripe').Stripe.Invoice & {
    // subscription_details is available in newer Stripe API versions but not in all SDK type defs
    subscription_details?: { metadata?: Record<string, string> }
  }
  const orgId = (invoice.metadata?.landlord_id ??
    invoice.subscription_details?.metadata?.landlord_id) as string | undefined
  if (!orgId) return  // no landlord_id metadata → can't route; log and drop
  await setOrgSubscriptionStatus(orgId, 'payment_failed')
  // TODO Plan 07: enqueue in-app notification once notification system exists (deferred to Phase 7)
}
