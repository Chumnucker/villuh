import { describe, it, expect } from 'vitest'

describe('AUTH-04: Trial start (no credit card)', () => {
  it('POST /api/billing/trial-start creates Stripe subscription with trial_period_days=30 (D-19)', () => {
    expect.fail('TODO: Plan 05 implements trial-start with Stripe API direct call')
  })
  it('trial start sets org.subscription_status=trialing and subscription_tier=pro', () => {
    expect.fail('TODO: Plan 05 syncs org row from Better Auth onSubscriptionCreated webhook')
  })
})

describe('AUTH-05: Per-unit metered billing (licensed quantity)', () => {
  it('unit create calls stripe.subscriptions.update with new quantity (D-21)', () => {
    expect.fail('TODO: Plan 05 implements unit quantity sync hook')
  })
})

describe('AUTH-06: Stripe Connect OAuth', () => {
  it('callback stores stripe_user_id on org.stripe_connected_account_id', () => {
    expect.fail('TODO: Plan 08 implements Stripe Connect callback')
  })
  it('OAuth state param matches landlord_id (CSRF mitigation)', () => {
    expect.fail('TODO: Plan 08 verifies state == landlord_id')
  })
})

describe('AUTH-07: Invoice listing + plan change', () => {
  it('GET /api/billing/invoices returns Stripe invoice list for current customer', () => {
    expect.fail('TODO: Plan 05 implements invoices route')
  })
  it('plan upgrade calls stripe.subscriptions.update with new price ID', () => {
    expect.fail('TODO: Plan 05 implements upgrade route')
  })
})

describe('Stripe webhook signature (T-2-09)', () => {
  it('rejects request with invalid signature (returns 400)', () => {
    expect.fail('TODO: Plan 05 verifies Better Auth Stripe plugin webhook handler')
  })
  it('processes customer.subscription.deleted by setting subscription_status=expired (D-22)', () => {
    expect.fail('TODO: Plan 05 implements onSubscriptionDeleted handler')
  })
})
