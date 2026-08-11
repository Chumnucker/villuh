import { stripeClient } from '../modules/auth/index.js'
import { getOrgSubscription } from '../modules/billing/service.js'

export type SyncUnitQuantityResult =
  | { ok: true; skipped: true; reason: 'no_subscription' }
  | { ok: true; quantity: number; status: string }

/**
 * Syncs the org's Stripe subscription-item quantity to the given active unit count.
 * Extracted from billing.syncUnits (Pattern 8) so units.create/archive and
 * properties.archive (cascade) can call it directly after their transaction commits,
 * without a tRPC-to-tRPC call. No-op when the org has no active Stripe subscription/item
 * yet (e.g. still on trial) — mirrors billing.syncUnits' `{ skipped: true }` shape.
 */
export async function syncOrgUnitQuantity(
  organizationId: string,
  unitCount: number,
): Promise<SyncUnitQuantityResult> {
  const existing = await getOrgSubscription(organizationId)
  if (!existing?.stripe_subscription_id || !existing?.stripe_subscription_item_id) {
    return { ok: true, skipped: true, reason: 'no_subscription' }
  }

  const sub = await stripeClient.subscriptions.update(existing.stripe_subscription_id, {
    items: [{ id: existing.stripe_subscription_item_id, quantity: unitCount }],
    proration_behavior: 'create_prorations',
  })
  return { ok: true, quantity: unitCount, status: sub.status }
}
