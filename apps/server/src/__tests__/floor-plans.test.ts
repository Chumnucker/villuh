import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import {
  signUpTestUser,
  markUserEmailVerified,
  signInAndActivateOrg,
  clearTestUsers,
  getCurrentUserId,
  createTrpcCaller,
} from './setup.js'

// S3 is mocked for all floor-plan gallery tests — no real bucket required (Assumption A6).
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function S3ClientMock() {
    return { send: vi.fn() }
  }),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}))
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.mock/presigned-url'),
}))

vi.mock('../modules/email/index.js', () => ({
  resend: { emails: { send: vi.fn().mockResolvedValue({ id: 'mock' }) } },
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendResetPasswordEmail: vi.fn().mockResolvedValue(undefined),
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}))

// Stripe is mocked because the assignment/archive cases create units, whose create/archive
// path calls the metered-billing sync (Pattern 8) — keep it hermetic like units.test.ts.
vi.mock('stripe', () => {
  class MockStripe {
    subscriptions = { update: vi.fn().mockResolvedValue({ status: 'active' }) }
  }
  return { default: MockStripe, Stripe: MockStripe }
})

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
  const { cookie } = await signInAndActivateOrg(email, 'TestPass123!')
  const caller = await createTrpcCaller(cookie)
  return { userId, caller }
}

type Caller = Awaited<ReturnType<typeof setupOwner>>['caller']

async function createProperty(caller: Caller, name: string) {
  const { property } = await caller.properties.create({ name })
  return property
}

describe('FP-01: Floor plan CRUD (D-05, D-23)', () => {
  it('creates and reads a floor plan under a property', async () => {
    const { caller } = await setupOwner('fpcreate@test.local')
    const property = await createProperty(caller, 'Maple Court')

    const { floorPlan } = await caller.floorPlans.create({
      propertyId: property.id,
      name: 'The Aspen',
      bedrooms: 2,
      bathrooms: 1,
      defaultSquareFootage: 850,
    })

    expect(floorPlan.name).toBe('The Aspen')
    expect(floorPlan.bedrooms).toBe(2)
    expect(floorPlan.defaultSquareFootage).toBe(850)
    expect(floorPlan.archivedAt).toBeNull()

    const read = await caller.floorPlans.get({ floorPlanId: floorPlan.id })
    expect(read.id).toBe(floorPlan.id)
    expect(read.name).toBe('The Aspen')
  })

  it('bathrooms round-trips as a JS number, not a string (D-07)', async () => {
    const { caller } = await setupOwner('fpbaths@test.local')
    const property = await createProperty(caller, 'Quarter Bath Property')

    const { floorPlan } = await caller.floorPlans.create({
      propertyId: property.id,
      name: 'The Fraction',
      bedrooms: 1,
      bathrooms: 1.75,
    })

    const read = await caller.floorPlans.get({ floorPlanId: floorPlan.id })
    expect(typeof read.bathrooms).toBe('number')
    expect(read.bathrooms).toBe(1.75)
  })

  it('update mutates fields and returns the updated plan', async () => {
    const { caller } = await setupOwner('fpupdate@test.local')
    const property = await createProperty(caller, 'Update Property')
    const { floorPlan } = await caller.floorPlans.create({
      propertyId: property.id,
      name: 'Original Plan',
      bedrooms: 1,
      bathrooms: 1,
    })

    const { floorPlan: updated } = await caller.floorPlans.update({
      floorPlanId: floorPlan.id,
      name: 'Renamed Plan',
      bedrooms: 3,
      bathrooms: 2.5,
      defaultSquareFootage: 1200,
    })

    expect(updated.name).toBe('Renamed Plan')
    expect(updated.bedrooms).toBe(3)
    expect(updated.bathrooms).toBe(2.5)
    expect(updated.defaultSquareFootage).toBe(1200)
  })
})

describe('FP-01: Per-property name uniqueness (D-09)', () => {
  it('rejects a duplicate name within the same property with BAD_REQUEST', async () => {
    const { caller } = await setupOwner('fpdupe@test.local')
    const property = await createProperty(caller, 'Uniqueness Property')

    await caller.floorPlans.create({
      propertyId: property.id,
      name: 'Duplicate Name',
      bedrooms: 1,
      bathrooms: 1,
    })

    await expect(
      caller.floorPlans.create({
        propertyId: property.id,
        name: 'Duplicate Name',
        bedrooms: 2,
        bathrooms: 2,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('allows the same name under a different property', async () => {
    const { caller } = await setupOwner('fpdupe2@test.local')
    const propertyA = await createProperty(caller, 'Property A')
    const propertyB = await createProperty(caller, 'Property B')

    await caller.floorPlans.create({
      propertyId: propertyA.id,
      name: 'Shared Name',
      bedrooms: 1,
      bathrooms: 1,
    })

    const { floorPlan } = await caller.floorPlans.create({
      propertyId: propertyB.id,
      name: 'Shared Name',
      bedrooms: 1,
      bathrooms: 1,
    })
    expect(floorPlan.name).toBe('Shared Name')
    expect(floorPlan.propertyId).toBe(propertyB.id)
  })
})

describe('FP-01: List shape — unitCount + cover URL + includeArchived (D-26, D-26a)', () => {
  it('list returns each plan with a numeric unitCount and a presigned cover URL (D-26)', async () => {
    const { caller } = await setupOwner('fplist@test.local')
    const property = await createProperty(caller, 'List Property')
    const { floorPlan } = await caller.floorPlans.create({
      propertyId: property.id,
      name: 'Listed Plan',
      bedrooms: 2,
      bathrooms: 1,
    })

    // A cover image so the presigned GET URL is attached at read time (D-16).
    await caller.floorPlans.gallery.add({
      floorPlanId: floorPlan.id,
      objectKey: `cover/${floorPlan.id}/img-0.jpg`,
      contentType: 'image/jpeg',
      byteLength: 1000,
    })

    // A unit assigned to the plan so unitCount is a real count, not zero.
    await caller.units.create({
      propertyId: property.id,
      label: 'Unit 1A',
      baseRentCents: 100000,
      floorPlanId: floorPlan.id,
    })

    const { floorPlans: list } = await caller.floorPlans.list({ propertyId: property.id })
    const found = list.find((p) => p.id === floorPlan.id)
    expect(found).toBeDefined()
    expect(typeof found?.unitCount).toBe('number')
    expect(found?.unitCount).toBe(1)
    expect(found?.coverImageUrl).toBe('https://s3.mock/presigned-url')
  })

  it('archived plans are hidden by default and present with includeArchived (D-26a)', async () => {
    const { caller } = await setupOwner('fparchivedlist@test.local')
    const property = await createProperty(caller, 'Archive List Property')
    const { floorPlan } = await caller.floorPlans.create({
      propertyId: property.id,
      name: 'Archivable Plan',
      bedrooms: 1,
      bathrooms: 1,
    })

    await caller.floorPlans.archive({ floorPlanId: floorPlan.id })

    const { floorPlans: defaultList } = await caller.floorPlans.list({ propertyId: property.id })
    expect(defaultList.some((p) => p.id === floorPlan.id)).toBe(false)

    const { floorPlans: withArchived } = await caller.floorPlans.list({
      propertyId: property.id,
      includeArchived: true,
    })
    const archived = withArchived.find((p) => p.id === floorPlan.id)
    expect(archived).toBeDefined()
    expect(archived?.archivedAt).toBeTruthy()
  })
})
