-- Migration 0005: Add stripe_subscription_item_id to subscription table
-- Required for per-unit billing quantity sync (D-21) — sync-units and upgrade routes
-- need the Stripe subscription item ID to call stripe.subscriptions.update({ items: [{ id: itemId }] })
ALTER TABLE "subscription" ADD COLUMN "stripe_subscription_item_id" text;
