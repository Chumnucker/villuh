import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { propertyAmenity } from '../schema/amenities.js'
import {
  signUpTestUser,
  markUserEmailVerified,
  signInAndActivateOrg,
  clearTestUsers,
  getCurrentUserId,
  getOrgIdForUser,
  createTrpcCaller,
  createOwnerClient,
  createAppClient,
  withTestOrganization,
} from './setup.js'

// S3 + presigner mocked (catalog tests never touch S3, but the module graph loads uploads/s3
// transitively — mirror gallery.test.ts so nothing reaches a real bucket). Email mocked so the
// signup/verify flow used by setupOwner never sends.
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

type Caller = Awaited<ReturnType<typeof setupOwner>>['caller']

async function createProperty(caller: Caller, name: string): Promise<{ id: string }> {
  const { property } = await caller.properties.create({ name })
  return property
}

// Property assignments are shipped by Plan 04; here we insert property_amenity rows directly
// through the RLS-enforced app connection (org context set) so the §9.4/§9.7/§9.9 catalog-side
// behaviors can be asserted without the property sub-router.
async function insertPropertyAmenity(
  orgId: string,
  values: {
    propertyId: string
    organizationAmenityId: string | null
    label: string
    iconKey?: 'IconStar' | 'IconPool' | 'IconRooftop' | 'IconLounge'
    colorKey?: 'slate' | 'blue' | 'green'
  },
): Promise<{ id: string }> {
  const app = createAppClient()
  try {
    return await withTestOrganization(app.db, orgId, 'system', async (tx) => {
      const [row] = await tx
        .insert(propertyAmenity)
        .values({
          organizationId: orgId,
          propertyId: values.propertyId,
          organizationAmenityId: values.organizationAmenityId,
          label: values.label,
          iconKey: values.iconKey ?? 'IconStar',
          colorKey: values.colorKey ?? 'slate',
        })
        .returning({ id: propertyAmenity.id })
      return row!
    })
  } finally {
    await app.end()
  }
}

type AssignmentRow = {
  id: string
  label: string
  icon_key: string
  color_key: string
  organization_amenity_id: string | null
}

async function readPropertyAmenity(id: string): Promise<AssignmentRow> {
  const owner = createOwnerClient()
  try {
    const rows = (await owner.db.execute(
      sql`SELECT id, label, icon_key, color_key, organization_amenity_id FROM property_amenity WHERE id = ${id}`,
    )) as unknown as AssignmentRow[]
    return rows[0]!
  } finally {
    await owner.end()
  }
}

async function countRows(query: ReturnType<typeof sql>): Promise<number> {
  const owner = createOwnerClient()
  try {
    const rows = (await owner.db.execute(query)) as unknown as { c: number }[]
    return rows[0]?.c ?? 0
  } finally {
    await owner.end()
  }
}

describe('AMEN-02 Catalog: isolation + uniqueness + seed', () => {
  it('§9.1 cross-org isolation: org B cannot see org A catalog amenities', async () => {
    const { caller: callerA } = await setupOwner('amen-iso-a@test.local')
    const { amenity } = await callerA.amenities.catalog.create({ name: 'Org A Secret Sauna', scope: 'property' })

    const { caller: callerB } = await setupOwner('amen-iso-b@test.local')
    const { amenities } = await callerB.amenities.catalog.list()

    expect(amenities.some((a) => a.id === amenity.id)).toBe(false)
    expect(amenities.some((a) => a.name === 'Org A Secret Sauna')).toBe(false)
  })

  it('§9.2 catalog (organization_id, name) uniqueness rejects duplicates with BAD_REQUEST', async () => {
    const { caller } = await setupOwner('amen-uniq@test.local')
    await caller.amenities.catalog.create({ name: 'Sauna', scope: 'property' })

    await expect(
      caller.amenities.catalog.create({ name: 'Sauna', scope: 'unit' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('§9 first catalog.list seeds exactly 22 is_system rows ordered by sortOrder', async () => {
    const { caller } = await setupOwner('amen-seed-first@test.local')
    const { amenities } = await caller.amenities.catalog.list()

    expect(amenities.length).toBe(22)
    expect(amenities.every((a) => a.isSystem)).toBe(true)
    expect(amenities[0]?.name).toBe('Pool')
    const sortOrders = amenities.map((a) => a.sortOrder)
    expect(sortOrders).toEqual([...sortOrders].sort((x, y) => x - y))
  })

  it('§9.8 seed guard: archived is_system rows are not resurrected', async () => {
    const { caller, orgId } = await setupOwner('amen-seed-guard@test.local')
    const first = await caller.amenities.catalog.list()
    expect(first.amenities.length).toBe(22)

    const owner = createOwnerClient()
    try {
      await owner.db.execute(
        sql`UPDATE organization_amenity SET archived_at = now() WHERE organization_id = ${orgId} AND is_system = true`,
      )
    } finally {
      await owner.end()
    }

    const second = await caller.amenities.catalog.list()
    expect(second.amenities.filter((a) => a.isSystem).length).toBe(0)

    // No NEW system rows inserted — the guard counts archived rows too (D-44).
    const systemCount = await countRows(
      sql`SELECT count(*)::int AS c FROM organization_amenity WHERE organization_id = ${orgId} AND is_system = true`,
    )
    expect(systemCount).toBe(22)
  })
})

describe('AMEN-02 Catalog: rename propagation + archive-intact + promote', () => {
  it('§9.4 rename propagates to matching-label assignments and spares customized labels (SC-2)', async () => {
    const { caller, orgId } = await setupOwner('amen-rename@test.local')
    const propertyA = await createProperty(caller, 'Rename Property A')
    const propertyB = await createProperty(caller, 'Rename Property B')
    const { amenity } = await caller.amenities.catalog.create({
      name: 'Rooftop deck',
      scope: 'property',
      iconKey: 'IconRooftop',
      colorKey: 'blue',
    })

    // Matching-label assignment (label == catalog name) — should follow the rename.
    const matching = await insertPropertyAmenity(orgId, {
      propertyId: propertyA.id,
      organizationAmenityId: amenity.id,
      label: 'Rooftop deck',
      iconKey: 'IconRooftop',
      colorKey: 'blue',
    })
    // Customized-label assignment on a different property (the partial unique index forbids two
    // catalog-backed rows on one property) — should be left untouched.
    const customized = await insertPropertyAmenity(orgId, {
      propertyId: propertyB.id,
      organizationAmenityId: amenity.id,
      label: 'Sky Lounge',
      iconKey: 'IconRooftop',
      colorKey: 'blue',
    })

    await caller.amenities.catalog.update({
      organizationAmenityId: amenity.id,
      name: 'Sky Terrace',
      iconKey: 'IconLounge',
      colorKey: 'green',
    })

    const m = await readPropertyAmenity(matching.id)
    expect(m.label).toBe('Sky Terrace')
    expect(m.icon_key).toBe('IconLounge')
    expect(m.color_key).toBe('green')

    const c = await readPropertyAmenity(customized.id)
    expect(c.label).toBe('Sky Lounge')
  })

  it('§9.7 archiving a catalog amenity leaves its assignment intact (SC-1)', async () => {
    const { caller, orgId } = await setupOwner('amen-archive@test.local')
    const property = await createProperty(caller, 'Archive Property')
    const { amenity } = await caller.amenities.catalog.create({
      name: 'Pool House',
      scope: 'property',
      iconKey: 'IconPool',
      colorKey: 'blue',
    })
    const assignment = await insertPropertyAmenity(orgId, {
      propertyId: property.id,
      organizationAmenityId: amenity.id,
      label: 'Pool House',
      iconKey: 'IconPool',
      colorKey: 'blue',
    })

    await caller.amenities.catalog.archive({ organizationAmenityId: amenity.id })

    const { amenities } = await caller.amenities.catalog.list()
    expect(amenities.some((a) => a.id === amenity.id)).toBe(false)

    // catalog.restore brings it back to the pickers.
    await caller.amenities.catalog.restore({ organizationAmenityId: amenity.id })
    const { amenities: restored } = await caller.amenities.catalog.list()
    expect(restored.some((a) => a.id === amenity.id)).toBe(true)

    const a = await readPropertyAmenity(assignment.id)
    expect(a.label).toBe('Pool House')
    expect(a.icon_key).toBe('IconPool')
    expect(a.color_key).toBe('blue')
    expect(a.organization_amenity_id).toBe(amenity.id)
  })

  it('§9.9 promoteFromProperty dedupes by name and links the existing catalog row', async () => {
    const { caller, orgId } = await setupOwner('amen-promote@test.local')
    // Trigger the seed so a system "Pool" catalog row exists to dedupe against.
    await caller.amenities.catalog.list()
    const poolRows = await (async () => {
      const owner = createOwnerClient()
      try {
        return (await owner.db.execute(
          sql`SELECT id FROM organization_amenity WHERE organization_id = ${orgId} AND name = 'Pool'`,
        )) as unknown as { id: string }[]
      } finally {
        await owner.end()
      }
    })()
    const poolId = poolRows[0]?.id ?? ''
    expect(poolId).toBeTruthy()

    const property = await createProperty(caller, 'Promote Property')
    const freeform = await insertPropertyAmenity(orgId, {
      propertyId: property.id,
      organizationAmenityId: null,
      label: 'Pool',
      iconKey: 'IconPool',
      colorKey: 'blue',
    })

    const result = await caller.amenities.catalog.promoteFromProperty({ propertyAmenityId: freeform.id })
    expect(result.amenity.id).toBe(poolId)

    const a = await readPropertyAmenity(freeform.id)
    expect(a.organization_amenity_id).toBe(poolId)

    // No duplicate "Pool" catalog row was created.
    const poolCount = await countRows(
      sql`SELECT count(*)::int AS c FROM organization_amenity WHERE organization_id = ${orgId} AND name = 'Pool'`,
    )
    expect(poolCount).toBe(1)
  })

  it('§9.11 catalog create/update/archive write organization_amenity audit rows', async () => {
    const { caller, orgId } = await setupOwner('amen-audit@test.local')
    const { amenity } = await caller.amenities.catalog.create({ name: 'Audit Sauna', scope: 'property' })
    await caller.amenities.catalog.update({ organizationAmenityId: amenity.id, name: 'Audit Sauna Renamed' })
    await caller.amenities.catalog.archive({ organizationAmenityId: amenity.id })

    const auditCount = await countRows(
      sql`SELECT count(*)::int AS c FROM audit_log WHERE organization_id = ${orgId} AND table_name = 'organization_amenity' AND row_id = ${amenity.id}`,
    )
    expect(auditCount).toBeGreaterThanOrEqual(3)
  })
})

describe('AMEN-04 Property assignments: scope + ownership + cross-entity (SC-5)', () => {
  it('§9.3 scope: unit-scoped catalog amenity rejected on a property; both + property accepted', async () => {
    const { caller } = await setupOwner('amen-scope@test.local')
    const property = await createProperty(caller, 'Scope Property')

    const { amenity: unitScoped } = await caller.amenities.catalog.create({ name: 'In-Unit Washer', scope: 'unit' })
    const { amenity: bothScoped } = await caller.amenities.catalog.create({ name: 'Parking', scope: 'both' })
    const { amenity: propScoped } = await caller.amenities.catalog.create({ name: 'Rooftop', scope: 'property' })

    // A unit-scoped amenity cannot be attached to a property (D-34, Pitfall 7).
    await expect(
      caller.amenities.property.add({ propertyId: property.id, organizationAmenityId: unitScoped.id }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })

    // A both-scoped amenity is accepted, and denormalizes label/icon/color from the catalog (D-23).
    const both = await caller.amenities.property.add({ propertyId: property.id, organizationAmenityId: bothScoped.id })
    expect(both.amenity.label).toBe('Parking')
    expect(both.amenity.organizationAmenityId).toBe(bothScoped.id)

    // A property-scoped amenity is accepted.
    const prop = await caller.amenities.property.add({ propertyId: property.id, organizationAmenityId: propScoped.id })
    expect(prop.amenity.label).toBe('Rooftop')

    const { amenities } = await caller.amenities.property.list({ propertyId: property.id })
    expect(amenities.map((a) => a.label).sort()).toEqual(['Parking', 'Rooftop'])
  })

  it('§9.3 unknown property or amenity → 404 (D-35); duplicate catalog attach → BAD_REQUEST (D-22)', async () => {
    const { caller } = await setupOwner('amen-own@test.local')
    const property = await createProperty(caller, 'Ownership Property')
    const { amenity } = await caller.amenities.catalog.create({ name: 'Gym', scope: 'both' })

    const missingId = '00000000-0000-0000-0000-000000000000'
    await expect(
      caller.amenities.property.add({ propertyId: missingId, organizationAmenityId: amenity.id }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(
      caller.amenities.property.add({ propertyId: property.id, organizationAmenityId: missingId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })

    await caller.amenities.property.add({ propertyId: property.id, organizationAmenityId: amenity.id })
    // The partial unique index rejects a second catalog-backed row for the same amenity (D-22).
    await expect(
      caller.amenities.property.add({ propertyId: property.id, organizationAmenityId: amenity.id }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('§9.10 cross-entity/IDOR: another org cannot update or remove a property assignment (D-36)', async () => {
    const { caller: callerA } = await setupOwner('amen-idor-a@test.local')
    const propertyA = await createProperty(callerA, 'IDOR Property A')
    const { amenity } = await callerA.amenities.catalog.create({ name: 'Sauna', scope: 'property' })
    const { amenity: assignment } = await callerA.amenities.property.add({
      propertyId: propertyA.id,
      organizationAmenityId: amenity.id,
    })

    const { caller: callerB } = await setupOwner('amen-idor-b@test.local')
    // Org B holds an id that resolves to a DIFFERENT org's property — rejected as not-found.
    await expect(
      callerB.amenities.property.update({ propertyAmenityId: assignment.id, label: 'Hijacked' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(
      callerB.amenities.property.remove({ propertyAmenityId: assignment.id }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })

    // The assignment is untouched for its true owner.
    const { amenities } = await callerA.amenities.property.list({ propertyId: propertyA.id })
    expect(amenities.some((a) => a.id === assignment.id && a.label === 'Sauna')).toBe(true)
  })

  it('§9.2 set bulk-replaces catalog-backed assignments and leaves freeform rows untouched (D-32)', async () => {
    const { caller } = await setupOwner('amen-set@test.local')
    const property = await createProperty(caller, 'Set Property')
    const { amenity: a1 } = await caller.amenities.catalog.create({ name: 'Pool', scope: 'both' })
    const { amenity: a2 } = await caller.amenities.catalog.create({ name: 'Elevator', scope: 'property' })

    await caller.amenities.property.add({ propertyId: property.id, organizationAmenityId: a1.id })
    const { amenity: freeform } = await caller.amenities.property.addFreeform({
      propertyId: property.id,
      label: 'Secret Garden',
    })
    expect(freeform.organizationAmenityId).toBeNull()

    // Replace catalog-backed set with just a2 — a1 goes, freeform stays.
    await caller.amenities.property.set({ propertyId: property.id, organizationAmenityIds: [a2.id] })

    const { amenities } = await caller.amenities.property.list({ propertyId: property.id })
    const labels = amenities.map((a) => a.label).sort()
    expect(labels).toEqual(['Elevator', 'Secret Garden'])
    expect(amenities.some((a) => a.label === 'Pool')).toBe(false)
  })

  it('§9.5 update patches ONE assignment and never touches the catalog (D-32)', async () => {
    const { caller } = await setupOwner('amen-patch@test.local')
    const property = await createProperty(caller, 'Patch Property')
    const { amenity: catalog } = await caller.amenities.catalog.create({ name: 'Lounge', scope: 'property' })
    const { amenity: assignment } = await caller.amenities.property.add({
      propertyId: property.id,
      organizationAmenityId: catalog.id,
    })

    const { amenity: patched } = await caller.amenities.property.update({
      propertyAmenityId: assignment.id,
      label: 'VIP Lounge',
      isReservable: true,
      requiresApproval: false,
    })
    expect(patched.label).toBe('VIP Lounge')
    expect(patched.isReservable).toBe(true)
    expect(patched.requiresApproval).toBe(false)

    // The catalog row name is unchanged — update never touches the catalog.
    const { amenities: catalogRows } = await caller.amenities.catalog.list()
    expect(catalogRows.find((a) => a.id === catalog.id)?.name).toBe('Lounge')
  })
})

describe('AMEN-04 Property amenity gallery: 10-cap + audit (SC-3)', () => {
  async function setupAssignment(email: string) {
    const { caller, orgId } = await setupOwner(email)
    const property = await createProperty(caller, 'Gallery Amenity Property')
    const { amenity } = await caller.amenities.catalog.create({ name: 'Party Room', scope: 'property' })
    const { amenity: assignment } = await caller.amenities.property.add({
      propertyId: property.id,
      organizationAmenityId: amenity.id,
    })
    return { caller, orgId, property, assignment }
  }

  it('§9.6 add 10 images, then 11th via gallery.add AND presignAmenityImage → BAD_REQUEST', async () => {
    const { caller, assignment } = await setupAssignment('amen-gallery-cap@test.local')

    for (let i = 0; i < 10; i++) {
      await caller.amenities.property.gallery.add({
        propertyAmenityId: assignment.id,
        objectKey: `orgtest/amenities/${assignment.id}/gallery/img-${i}.jpg`,
        contentType: 'image/jpeg',
        byteLength: 1000,
      })
    }

    // Enforcement point 1: gallery.add rejects the 11th.
    await expect(
      caller.amenities.property.gallery.add({
        propertyAmenityId: assignment.id,
        objectKey: `orgtest/amenities/${assignment.id}/gallery/img-10.jpg`,
        contentType: 'image/jpeg',
        byteLength: 1000,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })

    // Enforcement point 2: presignAmenityImage rejects the 11th too (double-enforced, D-26).
    await expect(
      caller.uploads.presignAmenityImage({
        propertyAmenityId: assignment.id,
        contentType: 'image/jpeg',
        byteLength: 1000,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('§9.6 presignAmenityImage returns objectKey only (never a URL) under the parent property key', async () => {
    const { caller, property, assignment } = await setupAssignment('amen-gallery-presign@test.local')

    const { uploadUrl, objectKey } = await caller.uploads.presignAmenityImage({
      propertyAmenityId: assignment.id,
      contentType: 'image/jpeg',
      byteLength: 2048,
    })
    expect(uploadUrl).toBe('https://s3.mock/presigned-url')
    expect(objectKey).not.toMatch(/^https?:\/\//)
    expect(objectKey).toContain(`properties/${property.id}/amenities/${assignment.id}/gallery/`)

    const { image } = await caller.amenities.property.gallery.add({
      propertyAmenityId: assignment.id,
      objectKey,
      contentType: 'image/jpeg',
      byteLength: 2048,
    })
    expect(image.objectKey).toBe(objectKey)

    // Read attaches a presigned GET URL at response time (never stored, D-26).
    const { images } = await caller.amenities.property.gallery.list({ propertyAmenityId: assignment.id })
    expect(images.find((img) => img.id === image.id)?.url).toBe('https://s3.mock/presigned-url')
  })

  it('§9.6 remove issues an S3 DeleteObjectCommand and drops the DB row', async () => {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3')
    const { caller, assignment } = await setupAssignment('amen-gallery-remove@test.local')

    const { image } = await caller.amenities.property.gallery.add({
      propertyAmenityId: assignment.id,
      objectKey: 'to-delete.jpg',
      contentType: 'image/jpeg',
      byteLength: 1000,
    })

    await caller.amenities.property.gallery.remove({ imageId: image.id })
    expect(DeleteObjectCommand).toHaveBeenCalled()

    const { images } = await caller.amenities.property.gallery.list({ propertyAmenityId: assignment.id })
    expect(images.find((img) => img.id === image.id)).toBeUndefined()
  })

  it('§9.11 property_amenity + property_amenity_image mutations write audit rows', async () => {
    const { caller, orgId, assignment } = await setupAssignment('amen-gallery-audit@test.local')
    await caller.amenities.property.update({ propertyAmenityId: assignment.id, label: 'Renamed Room' })
    const { image } = await caller.amenities.property.gallery.add({
      propertyAmenityId: assignment.id,
      objectKey: 'audit.jpg',
      contentType: 'image/jpeg',
      byteLength: 1000,
    })

    const paCount = await countRows(
      sql`SELECT count(*)::int AS c FROM audit_log WHERE organization_id = ${orgId} AND table_name = 'property_amenity' AND row_id = ${assignment.id}`,
    )
    expect(paCount).toBeGreaterThanOrEqual(2)

    const imgCount = await countRows(
      sql`SELECT count(*)::int AS c FROM audit_log WHERE organization_id = ${orgId} AND table_name = 'property_amenity_image' AND row_id = ${image.id}`,
    )
    expect(imgCount).toBeGreaterThanOrEqual(1)
  })
})
