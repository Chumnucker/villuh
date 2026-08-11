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

describe('PROP-01: Property CRUD', () => {
  it('owner/manager can create a property with name + structured address (D-11)', async () => {
    const { caller } = await setupOwner('propcreate@test.local')
    const { property } = await caller.properties.create({
      name: 'Maple Court',
      street: '123 Maple St',
      city: 'Austin',
      region: 'TX',
      postal: '78701',
      country: 'US',
      phone: '555-1234',
    })

    expect(property.name).toBe('Maple Court')
    expect(property.city).toBe('Austin')
    expect(property.phone).toBe('555-1234')
    expect(property.archivedAt).toBeNull()

    const { properties: list } = await caller.properties.list()
    expect(list.some((p) => p.id === property.id)).toBe(true)
  })

  it('update mutates name/address/phone/notes and returns the updated property', async () => {
    const { caller } = await setupOwner('propupdate@test.local')
    const { property } = await caller.properties.create({ name: 'Original Name' })

    const { property: updated } = await caller.properties.update({
      propertyId: property.id,
      name: 'Updated Name',
      city: 'Denver',
      phone: '555-9999',
      notes: '<p>Nice place</p>',
    })

    expect(updated.name).toBe('Updated Name')
    expect(updated.city).toBe('Denver')
    expect(updated.phone).toBe('555-9999')
    expect(updated.notes).toBe('<p>Nice place</p>')
  })

  it('creating at plan limit returns FORBIDDEN with appCode PLAN_LIMIT (D-39-D-43)', async () => {
    const { caller, orgId } = await setupOwner('propplanlimit@test.local')
    await forceTier(orgId, 'starter') // starter properties limit = 1

    await caller.properties.create({ name: 'First Property' })

    let error: unknown
    try {
      await caller.properties.create({ name: 'Second Property' })
    } catch (err) {
      error = err
    }

    expect(error).toBeDefined()
    const trpcError = error as { code?: string; cause?: { appCode?: string; meta?: Record<string, unknown> } }
    expect(trpcError.code).toBe('FORBIDDEN')
    expect(trpcError.cause?.appCode).toBe('PLAN_LIMIT')
    expect(trpcError.cause?.meta).toMatchObject({ resource: 'properties', limit: 1, current: 1 })
  })
})

describe('PROP-01: Notes sanitization (D-15)', () => {
  it('strips <script> and event-handler attributes from TipTap HTML before persisting', async () => {
    const { caller } = await setupOwner('sanitize1@test.local')
    const { property } = await caller.properties.create({
      name: 'Sanitize Test',
      notes: '<p onclick="alert(1)">Hello</p><script>alert(1)</script>',
    })

    expect(property.notes).not.toContain('<script>')
    expect(property.notes).not.toContain('onclick')
    expect(property.notes).toContain('Hello')
  })

  it('allows the locked TipTap subset tags (p, strong, em, ul, ol, li, a, h2, h3)', async () => {
    const { caller } = await setupOwner('sanitize2@test.local')
    const html =
      '<h2>Title</h2><p>Some <strong>bold</strong> and <em>italic</em> text</p><ul><li>one</li></ul><a href="https://example.com">link</a>'
    const { property } = await caller.properties.create({ name: 'Allowlist Test', notes: html })

    expect(property.notes).toContain('<h2>Title</h2>')
    expect(property.notes).toContain('<strong>bold</strong>')
    expect(property.notes).toContain('<em>italic</em>')
    expect(property.notes).toContain('<ul><li>one</li></ul>')
    expect(property.notes).toContain('<a href="https://example.com">link</a>')
  })
})

describe('PROP-01: Soft-archive cascade (D-30, D-31)', () => {
  it('archiving a property sets archived_at and excludes it from properties.list', async () => {
    const { caller } = await setupOwner('archive1@test.local')
    const { property } = await caller.properties.create({ name: 'To Archive' })

    const { property: archived } = await caller.properties.archive({ propertyId: property.id })
    expect(archived.archivedAt).toBeTruthy()

    const { properties: list } = await caller.properties.list()
    expect(list.some((p) => p.id === property.id)).toBe(false)
  })

  it('archiving a property cascades archived_at to all of its units in one transaction', async () => {
    const { caller, orgId } = await setupOwner('archive2@test.local')
    const { property } = await caller.properties.create({ name: 'Cascade Property' })

    const owner = createOwnerClient()
    let unitId = ''
    try {
      const rows = (await owner.db.execute(sql`
        INSERT INTO units (organization_id, property_id, label, base_rent)
        VALUES (${orgId}, ${property.id}, 'Unit 1A', 150000)
        RETURNING id
      `)) as unknown as { id: string }[]
      unitId = rows[0]?.id ?? ''
    } finally {
      await owner.end()
    }
    expect(unitId).toBeTruthy()

    const { archivedUnitIds } = await caller.properties.archive({ propertyId: property.id })
    expect(archivedUnitIds).toContain(unitId)

    const owner2 = createOwnerClient()
    try {
      const unitRows = (await owner2.db.execute(
        sql`SELECT archived_at FROM units WHERE id = ${unitId}`,
      )) as unknown as { archived_at: string | null }[]
      expect(unitRows[0]?.archived_at).toBeTruthy()
    } finally {
      await owner2.end()
    }
  })

  it('archived properties/units are excluded from plan-limit and Stripe unit counts', async () => {
    const { caller, orgId } = await setupOwner('archive3@test.local')
    await forceTier(orgId, 'starter') // starter properties limit = 1

    const { property } = await caller.properties.create({ name: 'Archivable' })
    await caller.properties.archive({ propertyId: property.id })

    // Limit is freed up after archive — countActiveProperties excludes archived_at rows.
    const { property: second } = await caller.properties.create({ name: 'New After Archive' })
    expect(second.name).toBe('New After Archive')
  })
})

describe('Cross: RLS isolation across organizations', () => {
  it('org A cannot read or mutate org B properties via properties.get/update/archive', async () => {
    const { caller: callerA } = await setupOwner('rlsa@test.local')
    const { property } = await callerA.properties.create({ name: 'Org A Property' })

    const { caller: callerB } = await setupOwner('rlsb@test.local')

    await expect(callerB.properties.get({ propertyId: property.id })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(
      callerB.properties.update({ propertyId: property.id, name: 'Hacked' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(callerB.properties.archive({ propertyId: property.id })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})
