import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import {
  signUpTestUser,
  markUserEmailVerified,
  signInAndActivateOrg,
  clearTestUsers,
  getCurrentUserId,
  getOrgIdForUser,
  createOwnerClient,
  createTrpcCaller,
} from './setup.js'

vi.mock('../modules/email/index.js', () => ({
  resend: { emails: { send: vi.fn().mockResolvedValue({ id: 'mock' }) } },
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendResetPasswordEmail: vi.fn().mockResolvedValue(undefined),
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}))

// Mock Stripe SDK so Stripe metered-sync assertions (D-21) stay hermetic — same pattern as billing.test.ts.
const _stripeMockFns = {
  subscriptionsUpdate: vi.fn(),
}

vi.mock('stripe', () => {
  class MockStripe {
    subscriptions = { update: _stripeMockFns.subscriptionsUpdate }
  }
  return { default: MockStripe, Stripe: MockStripe }
})

beforeAll(async () => {
  await clearTestUsers()
})
afterAll(async () => {
  await clearTestUsers()
})
beforeEach(() => {
  _stripeMockFns.subscriptionsUpdate.mockReset()
  _stripeMockFns.subscriptionsUpdate.mockResolvedValue({ status: 'active' })
})

async function setupOwner(email: string) {
  await signUpTestUser(email, 'TestPass123!', 'Owner')
  const userId = await getCurrentUserId(email)
  await markUserEmailVerified(userId)
  const orgId = await getOrgIdForUser(userId)
  const { cookie } = await signInAndActivateOrg(email, 'TestPass123!')
  const caller = await createTrpcCaller(cookie)
  return { userId, orgId, caller }
}

async function forceTier(orgId: string, tier: string) {
  const owner = createOwnerClient()
  try {
    await owner.db.execute(sql`UPDATE organization SET subscription_tier = ${tier} WHERE id = ${orgId}`)
  } finally {
    await owner.end()
  }
}

async function addSubscription(orgId: string, subscriptionId: string, itemId: string) {
  const owner = createOwnerClient()
  try {
    await owner.db.execute(sql`
      INSERT INTO "subscription" (id, "reference_id", "stripe_customer_id", "stripe_subscription_id", "stripe_subscription_item_id", status, plan, "period_start")
      VALUES (gen_random_uuid()::text, ${orgId}, 'cus_units_test', ${subscriptionId}, ${itemId}, 'active', 'pro', now())
    `)
  } finally {
    await owner.end()
  }
}

describe('UNIT-01: Unit CRUD', () => {
  it('owner/manager can create a unit under a property with label/sqft/base_rent/status (D-10)', async () => {
    const { caller } = await setupOwner('unitcreate@test.local')
    const { property } = await caller.properties.create({ name: 'Property A' })
    const { statuses } = await caller.unitStatuses.list()
    const availableStatus = statuses.find((s) => s.name === 'Available')

    const { unit } = await caller.units.create({
      propertyId: property.id,
      label: 'Unit 1A',
      squareFootage: 750,
      baseRentCents: 150000,
      statusId: availableStatus?.id,
    })

    expect(unit.label).toBe('Unit 1A')
    expect(unit.squareFootage).toBe(750)
    expect(unit.baseRent).toBe(150000)
    expect(unit.statusId).toBe(availableStatus?.id)
    expect(unit.archivedAt).toBeNull()

    const { units: list } = await caller.units.list()
    expect(list.some((u) => u.id === unit.id)).toBe(true)
  })

  it('update mutates unit fields and returns the updated unit', async () => {
    const { caller } = await setupOwner('unitupdate@test.local')
    const { property } = await caller.properties.create({ name: 'Property B' })
    const { unit } = await caller.units.create({
      propertyId: property.id,
      label: 'Original',
      baseRentCents: 100000,
    })

    const { unit: updated } = await caller.units.update({
      unitId: unit.id,
      label: 'Renovated',
      baseRentCents: 125000,
      squareFootage: 900,
    })

    expect(updated.label).toBe('Renovated')
    expect(updated.baseRent).toBe(125000)
    expect(updated.squareFootage).toBe(900)
  })

  it("creating a unit for another organization's property is rejected (RLS + ownership check)", async () => {
    const { caller: callerA } = await setupOwner('unitrlsa@test.local')
    const { property } = await callerA.properties.create({ name: 'Org A Property' })

    const { caller: callerB } = await setupOwner('unitrlsb@test.local')

    await expect(
      callerB.units.create({ propertyId: property.id, label: 'Intruder Unit', baseRentCents: 50000 }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('UNIT-01: Plan limit enforcement (D-39-D-43)', () => {
  it('creating a unit at/over plan limit returns FORBIDDEN with appCode PLAN_LIMIT', async () => {
    const { caller, orgId } = await setupOwner('unitplanlimit@test.local')
    await forceTier(orgId, 'starter') // starter units limit = 5
    const { property } = await caller.properties.create({ name: 'Limit Property' })

    for (let i = 0; i < 5; i++) {
      await caller.units.create({ propertyId: property.id, label: `Unit ${i}`, baseRentCents: 100000 })
    }

    let error: unknown
    try {
      await caller.units.create({ propertyId: property.id, label: 'Unit 6', baseRentCents: 100000 })
    } catch (err) {
      error = err
    }

    expect(error).toBeDefined()
    const trpcError = error as { code?: string; cause?: { appCode?: string; meta?: Record<string, unknown> } }
    expect(trpcError.code).toBe('FORBIDDEN')
    expect(trpcError.cause?.appCode).toBe('PLAN_LIMIT')
    expect(trpcError.cause?.meta).toMatchObject({ resource: 'units', limit: 5, current: 5 })
  })

  it('pro tier with -1 unit limit allows unlimited unit creation', async () => {
    const { caller, orgId } = await setupOwner('unitprolimit@test.local')
    await forceTier(orgId, 'pro')
    const { property } = await caller.properties.create({ name: 'Pro Property' })

    for (let i = 0; i < 6; i++) {
      const { unit } = await caller.units.create({
        propertyId: property.id,
        label: `Unit ${i}`,
        baseRentCents: 100000,
      })
      expect(unit.label).toBe(`Unit ${i}`)
    }
  })
})

describe('UNIT-01: Stripe metered billing sync (D-21, Pattern 8)', () => {
  it('unit create triggers Stripe subscription quantity sync with the active unit count', async () => {
    const { caller, orgId } = await setupOwner('unitstripe@test.local')
    await addSubscription(orgId, 'sub_unit_1', 'si_unit_1')
    const { property } = await caller.properties.create({ name: 'Stripe Property' })

    await caller.units.create({ propertyId: property.id, label: 'Unit 1', baseRentCents: 100000 })

    expect(_stripeMockFns.subscriptionsUpdate).toHaveBeenCalledWith(
      'sub_unit_1',
      expect.objectContaining({ items: [expect.objectContaining({ id: 'si_unit_1', quantity: 1 })] }),
    )
  })

  it('unit archive triggers Stripe subscription quantity sync with the decremented active unit count', async () => {
    const { caller, orgId } = await setupOwner('unitstripearchive@test.local')
    await addSubscription(orgId, 'sub_unit_2', 'si_unit_2')
    const { property } = await caller.properties.create({ name: 'Stripe Archive Property' })
    const { unit } = await caller.units.create({ propertyId: property.id, label: 'Unit 1', baseRentCents: 100000 })
    _stripeMockFns.subscriptionsUpdate.mockClear()

    await caller.units.archive({ unitId: unit.id })

    expect(_stripeMockFns.subscriptionsUpdate).toHaveBeenCalledWith(
      'sub_unit_2',
      expect.objectContaining({ items: [expect.objectContaining({ id: 'si_unit_2', quantity: 0 })] }),
    )
  })
})

describe('UNIT-01: Soft-archive (D-32)', () => {
  it('archiving a unit sets archived_at and excludes it from units.list', async () => {
    const { caller } = await setupOwner('unitarchive@test.local')
    const { property } = await caller.properties.create({ name: 'Archive Property' })
    const { unit } = await caller.units.create({
      propertyId: property.id,
      label: 'To Archive',
      baseRentCents: 100000,
    })

    const { unit: archived } = await caller.units.archive({ unitId: unit.id })
    expect(archived.archivedAt).toBeTruthy()

    const { units: list } = await caller.units.list()
    expect(list.some((u) => u.id === unit.id)).toBe(false)
  })
})
