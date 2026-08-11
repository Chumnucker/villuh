import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import {
  signUpTestUser,
  markUserEmailVerified,
  signInAndActivateOrg,
  clearTestUsers,
  getCurrentUserId,
  getOrgIdForUser,
  fetchApi,
  createOwnerClient,
} from './setup.js'
import { sql } from 'drizzle-orm'

// Mock Resend
vi.mock('../lib/email.js', () => ({
  resend: { emails: { send: vi.fn().mockResolvedValue({ id: 'mock' }) } },
  sendVerificationEmail: vi.fn(),
  sendResetPasswordEmail: vi.fn(),
  sendInvitationEmail: vi.fn(),
}))

// Mock Stripe SDK — override the Stripe constructor used in auth.ts
// The mock fns are defined module-level so tests can access them via stripeMocks.__mocks
const _stripeMockFns = {
  subscriptionsCreate: vi.fn(),
  subscriptionsUpdate: vi.fn(),
  subscriptionsRetrieve: vi.fn(),
  customersCreate: vi.fn(),
  customersSearch: vi.fn(),
  customersRetrieve: vi.fn(),
  customersUpdate: vi.fn(),
  setupIntentsCreate: vi.fn(),
  invoicesList: vi.fn(),
  paymentMethodsAttach: vi.fn(),
}

vi.mock('stripe', () => {
  // Use a class so `new Stripe(...)` works correctly
  class MockStripe {
    subscriptions = {
      create: _stripeMockFns.subscriptionsCreate,
      update: _stripeMockFns.subscriptionsUpdate,
      retrieve: _stripeMockFns.subscriptionsRetrieve,
    }
    customers = {
      create: _stripeMockFns.customersCreate,
      search: _stripeMockFns.customersSearch,
      retrieve: _stripeMockFns.customersRetrieve,
      update: _stripeMockFns.customersUpdate,
    }
    setupIntents = { create: _stripeMockFns.setupIntentsCreate }
    invoices = { list: _stripeMockFns.invoicesList }
    paymentMethods = { attach: _stripeMockFns.paymentMethodsAttach }
    webhooks = { constructEvent: vi.fn() }
    oauth = { token: vi.fn() }
  }
  return { default: MockStripe, Stripe: MockStripe }
})

beforeAll(async () => { await clearTestUsers() })
afterAll(async () => { await clearTestUsers() })
beforeEach(() => {
  // Reset mock state
  Object.values(_stripeMockFns).forEach((fn) => fn.mockReset())
  // Default: customer search returns empty (no existing customer)
  _stripeMockFns.customersSearch.mockResolvedValue({ data: [] })
  _stripeMockFns.customersCreate.mockResolvedValue({ id: 'cus_test_001' })
})

describe('AUTH-04: Trial start (no credit card)', () => {
  it('POST /api/billing/trial-start creates Stripe subscription with trial_period_days=30 (D-19)', async () => {
    _stripeMockFns.subscriptionsCreate.mockResolvedValueOnce({
      id: 'sub_trial_001',
      trial_end: Math.floor(Date.now() / 1000) + 30 * 86400,
      status: 'trialing',
    })

    await signUpTestUser('trial@test.local', 'TestPass123!', 'Trial User')
    const userId = await getCurrentUserId('trial@test.local')
    await markUserEmailVerified(userId)
    const { cookie } = await signInAndActivateOrg('trial@test.local', 'TestPass123!')

    const res = await fetchApi('/api/billing/trial-start', { method: 'POST', headers: { cookie } })
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; subscriptionId: string; tier: string; status: string }
    expect(body.ok).toBe(true)
    expect(body.tier).toBe('pro')
    expect(body.status).toBe('trialing')

    // Stripe was called with the right args
    expect(_stripeMockFns.subscriptionsCreate).toHaveBeenCalledWith(expect.objectContaining({
      trial_period_days: 30,
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
      items: [expect.objectContaining({ quantity: 0 })],
      metadata: expect.objectContaining({ landlord_id: expect.any(String) }),
    }))
  })

  it('trial start sets org.subscription_status=trialing and subscription_tier=pro', async () => {
    _stripeMockFns.subscriptionsCreate.mockResolvedValueOnce({
      id: 'sub_trial_002',
      trial_end: Math.floor(Date.now() / 1000) + 30 * 86400,
      status: 'trialing',
    })

    await signUpTestUser('trialsync@test.local', 'TestPass123!', 'Trial Sync')
    const userId = await getCurrentUserId('trialsync@test.local')
    const orgId = await getOrgIdForUser(userId)
    await markUserEmailVerified(userId)
    const { cookie } = await signInAndActivateOrg('trialsync@test.local', 'TestPass123!')

    // PRE-state: D-19/D-33/D-39 reconciliation — fresh org defaults to subscription_status='trial_pending'
    {
      const owner = createOwnerClient()
      try {
        const pre = await owner.db.execute(sql`SELECT subscription_status FROM organization WHERE id = ${orgId}`) as unknown as { subscription_status: string }[]
        expect(pre[0]?.subscription_status).toBe('trial_pending')
      } finally { await owner.end() }
    }

    await fetchApi('/api/billing/trial-start', { method: 'POST', headers: { cookie } })

    const owner = createOwnerClient()
    try {
      const rows = await owner.db.execute(sql`SELECT subscription_tier, subscription_status, setup_completed FROM organization WHERE id = ${orgId}`) as unknown as { subscription_tier: string; subscription_status: string; setup_completed: boolean }[]
      expect(rows[0]?.subscription_tier).toBe('pro')
      expect(rows[0]?.subscription_status).toBe('trialing')    // POST-state: trial_pending → trialing
      expect(rows[0]?.setup_completed).toBe(true)              // D-39: trial start sets setup_completed
    } finally { await owner.end() }
  })

  it('trial-start is idempotent — second call returns alreadyActive', async () => {
    _stripeMockFns.subscriptionsCreate.mockResolvedValue({
      id: 'sub_idem_001',
      trial_end: Math.floor(Date.now() / 1000) + 30 * 86400,
      status: 'trialing',
    })

    await signUpTestUser('idem@test.local', 'TestPass123!', 'Idempotent')
    const userId = await getCurrentUserId('idem@test.local')
    const orgId = await getOrgIdForUser(userId)
    await markUserEmailVerified(userId)
    const { cookie } = await signInAndActivateOrg('idem@test.local', 'TestPass123!')

    // First call — creates subscription
    await fetchApi('/api/billing/trial-start', { method: 'POST', headers: { cookie } })

    // Insert a subscription row to simulate the webhook having fired
    const owner = createOwnerClient()
    try {
      await owner.db.execute(sql`
        INSERT INTO "subscription" (id, "reference_id", "stripe_customer_id", "stripe_subscription_id", status, plan, "period_start")
        VALUES (gen_random_uuid()::text, ${orgId}, 'cus_idem', 'sub_idem_001', 'trialing', 'pro', now())
        ON CONFLICT DO NOTHING
      `)
    } finally { await owner.end() }

    const r2 = await fetchApi('/api/billing/trial-start', { method: 'POST', headers: { cookie } })
    expect(r2.status).toBe(200)
    const body = await r2.json() as { alreadyActive?: boolean }
    expect(body.alreadyActive).toBe(true)
  })
})

describe('AUTH-05: Per-unit metered billing (sync-units)', () => {
  it('POST /api/billing/sync-units updates Stripe subscription quantity (D-21)', async () => {
    await signUpTestUser('sync@test.local', 'TestPass123!', 'Sync User')
    const userId = await getCurrentUserId('sync@test.local')
    const orgId = await getOrgIdForUser(userId)
    await markUserEmailVerified(userId)
    const { cookie } = await signInAndActivateOrg('sync@test.local', 'TestPass123!')

    // Insert subscription row with item ID
    const owner = createOwnerClient()
    try {
      await owner.db.execute(sql`
        INSERT INTO "subscription" (id, "reference_id", "stripe_customer_id", "stripe_subscription_id", "stripe_subscription_item_id", status, plan, "period_start")
        VALUES (gen_random_uuid()::text, ${orgId}, 'cus_sync', 'sub_sync', 'si_sync', 'active', 'pro', now())
      `)
    } finally { await owner.end() }

    _stripeMockFns.subscriptionsUpdate.mockResolvedValueOnce({ status: 'active' })

    const res = await fetchApi('/api/billing/sync-units', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ unitCount: 7 }),
    })
    expect(res.status).toBe(200)
    expect(_stripeMockFns.subscriptionsUpdate).toHaveBeenCalledWith('sub_sync', expect.objectContaining({
      items: [expect.objectContaining({ id: 'si_sync', quantity: 7 })],
    }))
  })

  it('sync-units skips when no subscription exists (returns skipped: true)', async () => {
    await signUpTestUser('nosub@test.local', 'TestPass123!', 'No Sub')
    const userId = await getCurrentUserId('nosub@test.local')
    await markUserEmailVerified(userId)
    const { cookie } = await signInAndActivateOrg('nosub@test.local', 'TestPass123!')

    const res = await fetchApi('/api/billing/sync-units', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ unitCount: 3 }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { skipped?: boolean }
    expect(body.skipped).toBe(true)
  })
})

describe('AUTH-07: Invoice list', () => {
  it('GET /api/billing/invoices fetches from Stripe API and returns mapped data', async () => {
    await signUpTestUser('inv@test.local', 'TestPass123!', 'Invoice User')
    const userId = await getCurrentUserId('inv@test.local')
    const orgId = await getOrgIdForUser(userId)
    await markUserEmailVerified(userId)
    const { cookie } = await signInAndActivateOrg('inv@test.local', 'TestPass123!')

    const owner = createOwnerClient()
    try {
      await owner.db.execute(sql`
        INSERT INTO "subscription" (id, "reference_id", "stripe_customer_id", "stripe_subscription_id", status, plan, "period_start")
        VALUES (gen_random_uuid()::text, ${orgId}, 'cus_inv', 'sub_inv', 'active', 'starter', now())
      `)
    } finally { await owner.end() }

    _stripeMockFns.invoicesList.mockResolvedValueOnce({
      data: [
        {
          id: 'in_1',
          number: 'INV-001',
          amount_paid: 5000,
          amount_due: 0,
          currency: 'usd',
          status: 'paid',
          created: 1700000000,
          due_date: null,
          hosted_invoice_url: 'https://invoice.stripe.com/1',
          invoice_pdf: 'https://invoice.stripe.com/1.pdf',
        },
      ],
    })

    const res = await fetchApi('/api/billing/invoices', { headers: { cookie } })
    expect(res.status).toBe(200)
    const body = await res.json() as { invoices: { id: string; number: string; status: string }[] }
    expect(body.invoices).toHaveLength(1)
    expect(body.invoices[0]).toMatchObject({ id: 'in_1', number: 'INV-001', status: 'paid' })
  })

  it('GET /api/billing/invoices returns empty array when no subscription exists', async () => {
    await signUpTestUser('noinv@test.local', 'TestPass123!', 'No Invoice')
    const userId = await getCurrentUserId('noinv@test.local')
    await markUserEmailVerified(userId)
    const { cookie } = await signInAndActivateOrg('noinv@test.local', 'TestPass123!')

    const res = await fetchApi('/api/billing/invoices', { headers: { cookie } })
    expect(res.status).toBe(200)
    const body = await res.json() as { invoices: unknown[] }
    expect(body.invoices).toEqual([])
  })
})

// Stripe webhook tests deferred: Better Auth Stripe plugin handles signature verification + dispatch internally
describe('Stripe webhook subscription state sync (D-22, T-2-09)', () => {
  it('setOrgSubscriptionStatus(orgId, "expired") sets org.subscription_status', async () => {
    await signUpTestUser('webhook@test.local', 'TestPass123!', 'Webhook User')
    const userId = await getCurrentUserId('webhook@test.local')
    const orgId = await getOrgIdForUser(userId)

    const { setOrgSubscriptionStatus } = await import('../lib/billing.js')
    await setOrgSubscriptionStatus(orgId, 'expired')

    const owner = createOwnerClient()
    try {
      const rows = await owner.db.execute(sql`SELECT subscription_status FROM organization WHERE id = ${orgId}`) as unknown as { subscription_status: string }[]
      expect(rows[0]?.subscription_status).toBe('expired')
    } finally { await owner.end() }
  })
})

// Stripe Connect tests — Plan 08 implements them
describe('AUTH-06: Stripe Connect OAuth', () => {
  it.todo('callback stores stripe_user_id on org.stripe_connected_account_id (Plan 08)')
  it.todo('OAuth state param matches landlord_id (Plan 08)')
})
