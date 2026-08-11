import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
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

beforeAll(async () => {
  await clearTestUsers()
})
afterAll(async () => {
  await clearTestUsers()
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

describe('AUTH-03: Plan limit enforcement', () => {
  it('starter tier blocks 6th unit creation with 402 PLAN_LIMIT (D-18, D-41, D-42)', () => {
    expect.fail('TODO: Plan 06 implements checkPlanLimit middleware')
  })
  it('402 response shape matches D-42 exactly { code, resource, limit, current, upgrade_to }', () => {
    expect.fail('TODO: Plan 06 returns exact D-42 shape')
  })
  it('pro tier with -1 limit allows unlimited creation', () => {
    expect.fail('TODO: Plan 06 handles -1 limit as unlimited')
  })
})

describe('AUTH-04: Trial + subscription gate', () => {
  it('trialing status allows write actions (D-19)', () => {
    expect.fail('TODO: Plan 06 implements subscription gate')
  })
  it('expired status blocks all writes with 402 SUBSCRIPTION_REQUIRED (D-25, D-43)', () => {
    expect.fail('TODO: Plan 06 implements subscriptionExpiredGate')
  })
})

describe('PROP-01: Properties plan limit enforcement (D-39-D-43)', () => {
  it('starter tier blocks property creation past the tier limit with appCode PLAN_LIMIT', async () => {
    const { caller, orgId } = await setupOwner('planlimitprop@test.local')
    await forceTier(orgId, 'starter') // starter properties limit = 1
    await caller.properties.create({ name: 'First Property' })

    await expect(caller.properties.create({ name: 'Second Property' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('PLAN_LIMIT error data matches { resource: "properties", limit, current, upgrade_to }', async () => {
    const { caller, orgId } = await setupOwner('planlimitpropdata@test.local')
    await forceTier(orgId, 'starter')
    await caller.properties.create({ name: 'First Property' })

    let error: unknown
    try {
      await caller.properties.create({ name: 'Second Property' })
    } catch (err) {
      error = err
    }

    const trpcError = error as { cause?: { appCode?: string; meta?: Record<string, unknown> } }
    expect(trpcError.cause?.appCode).toBe('PLAN_LIMIT')
    expect(trpcError.cause?.meta).toMatchObject({
      resource: 'properties',
      limit: 1,
      current: 1,
      upgrade_to: 'growth',
    })
  })
})

describe('UNIT-01: Units plan limit enforcement (D-39-D-43)', () => {
  it('starter tier blocks unit creation past the tier limit with appCode PLAN_LIMIT', async () => {
    const { caller, orgId } = await setupOwner('planlimitunit@test.local')
    await forceTier(orgId, 'starter') // starter units limit = 5
    const { property } = await caller.properties.create({ name: 'Limit Property' })
    for (let i = 0; i < 5; i++) {
      await caller.units.create({ propertyId: property.id, label: `Unit ${i}`, baseRentCents: 100000 })
    }

    await expect(
      caller.units.create({ propertyId: property.id, label: 'Unit 6', baseRentCents: 100000 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('PLAN_LIMIT error data matches { resource: "units", limit, current, upgrade_to }', async () => {
    const { caller, orgId } = await setupOwner('planlimitunitdata@test.local')
    await forceTier(orgId, 'starter')
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

    const trpcError = error as { cause?: { appCode?: string; meta?: Record<string, unknown> } }
    expect(trpcError.cause?.appCode).toBe('PLAN_LIMIT')
    expect(trpcError.cause?.meta).toMatchObject({
      resource: 'units',
      limit: 5,
      current: 5,
      upgrade_to: 'growth',
    })
  })

  it('pro tier with -1 unit limit allows unlimited creation', async () => {
    const { caller, orgId } = await setupOwner('planlimitunitpro@test.local')
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
