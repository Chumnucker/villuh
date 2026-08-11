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

// Demote the caller's membership row directly — permissionProcedure resolves role live via
// auth.api.getActiveMember on every request, so the existing session cookie/caller stays valid.
async function setRole(userId: string, orgId: string, role: 'owner' | 'manager' | 'viewer') {
  const owner = createOwnerClient()
  try {
    await owner.db.execute(
      sql`UPDATE "member" SET role = ${role} WHERE user_id = ${userId} AND organization_id = ${orgId}`,
    )
  } finally {
    await owner.end()
  }
}

describe('PROP-02: Freeform property tags (D-17)', () => {
  it('a freeform tag can be attached to a property with icon + color from the fixed palette (D-21)', async () => {
    const { caller } = await setupOwner('tagfreeform@test.local')
    const { property } = await caller.properties.create({ name: 'Freeform Tag Property' })

    const { tag } = await caller.tags.addFreeform({
      propertyId: property.id,
      label: 'Downtown',
      iconKey: 'IconMapPin',
      colorKey: 'blue',
    })

    expect(tag.label).toBe('Downtown')
    expect(tag.iconKey).toBe('IconMapPin')
    expect(tag.colorKey).toBe('blue')
    expect(tag.propertyId).toBe(property.id)
  })

  it('freeform tags are org-scoped display-only rows with organization_tag_id = null', async () => {
    const { caller } = await setupOwner('tagfreeformnull@test.local')
    const { property } = await caller.properties.create({ name: 'Freeform Null Property' })

    const { tag } = await caller.tags.addFreeform({
      propertyId: property.id,
      label: 'Waterfront',
      iconKey: 'IconLeaf',
      colorKey: 'teal',
    })
    expect(tag.organizationTagId).toBeNull()

    const { tags } = await caller.tags.listPropertyTags({ propertyId: property.id })
    expect(tags).toHaveLength(1)
    expect(tags[0]?.organizationTagId).toBeNull()
  })

  it('rejects a tag icon key outside the fixed palette (D-21 / T-03-16)', async () => {
    const { caller } = await setupOwner('tagpalette@test.local')
    const { property } = await caller.properties.create({ name: 'Palette Property' })

    const invalidInput = {
      propertyId: property.id,
      label: 'Bad Icon',
      iconKey: 'IconNotReal',
      colorKey: 'blue',
    } as unknown as Parameters<typeof caller.tags.addFreeform>[0]

    await expect(caller.tags.addFreeform(invalidInput)).rejects.toBeTruthy()
  })
})

describe('PROP-02: Promote freeform tag to org catalog (D-18)', () => {
  it('promote requires write permission and creates an organization_tag catalog row', async () => {
    const { caller } = await setupOwner('tagpromote@test.local')
    const { property } = await caller.properties.create({ name: 'Promote Property' })
    const { tag: freeform } = await caller.tags.addFreeform({
      propertyId: property.id,
      label: 'Luxury',
      iconKey: 'IconStar',
      colorKey: 'violet',
    })

    const { tag: catalogTag, propertyTag: promoted } = await caller.tags.promoteFreeform({
      propertyTagId: freeform.id,
    })

    expect(catalogTag.name).toBe('Luxury')
    expect(promoted?.organizationTagId).toBe(catalogTag.id)

    const { tags: catalogTags } = await caller.tags.listOrganizationTags()
    expect(catalogTags.some((t) => t.id === catalogTag.id)).toBe(true)
  })

  it('viewer role cannot promote a tag (FORBIDDEN)', async () => {
    const { caller, userId, orgId } = await setupOwner('tagpromoteviewer@test.local')
    const { property } = await caller.properties.create({ name: 'Promote Viewer Property' })
    const { tag: freeform } = await caller.tags.addFreeform({
      propertyId: property.id,
      label: 'ViewerBlocked',
      iconKey: 'IconFlag',
      colorKey: 'red',
    })

    await setRole(userId, orgId, 'viewer')

    await expect(caller.tags.promoteFreeform({ propertyTagId: freeform.id })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })
})

describe('PROP-02: Delete org catalog tag cascades detach (D-19, D-20)', () => {
  it('deleting an org tag in use detaches it from every property, then deletes the catalog row', async () => {
    const { caller } = await setupOwner('tagdelete@test.local')
    const { tag: catalogTag } = await caller.tags.createOrganizationTag({
      name: 'Seasonal',
      iconKey: 'IconFlame',
      colorKey: 'orange',
    })

    const { property: propertyA } = await caller.properties.create({ name: 'Delete Tag Property A' })
    const { property: propertyB } = await caller.properties.create({ name: 'Delete Tag Property B' })

    await caller.tags.attachOrganizationTag({ propertyId: propertyA.id, organizationTagId: catalogTag.id })
    await caller.tags.attachOrganizationTag({ propertyId: propertyB.id, organizationTagId: catalogTag.id })

    await caller.tags.deleteOrganizationTag({ organizationTagId: catalogTag.id })

    const { tags: tagsA } = await caller.tags.listPropertyTags({ propertyId: propertyA.id })
    const { tags: tagsB } = await caller.tags.listPropertyTags({ propertyId: propertyB.id })
    expect(tagsA).toHaveLength(0)
    expect(tagsB).toHaveLength(0)

    const { tags: catalogTags } = await caller.tags.listOrganizationTags()
    expect(catalogTags.some((t) => t.id === catalogTag.id)).toBe(false)
  })

  it('delete requires write permission', async () => {
    const { caller, userId, orgId } = await setupOwner('tagdeleteviewer@test.local')
    const { tag: catalogTag } = await caller.tags.createOrganizationTag({
      name: 'DeleteBlocked',
      iconKey: 'IconWrench',
      colorKey: 'amber',
    })

    await setRole(userId, orgId, 'viewer')

    await expect(caller.tags.deleteOrganizationTag({ organizationTagId: catalogTag.id })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })
})

describe('PROP-02: Cross-org RLS isolation (T-03-14b)', () => {
  it('an organization cannot read or mutate another organization\'s catalog tags', async () => {
    const { caller: callerA } = await setupOwner('tagorga@test.local')
    const { caller: callerB } = await setupOwner('tagorgb@test.local')

    const { tag: tagA } = await callerA.tags.createOrganizationTag({
      name: 'OrgAOnly',
      iconKey: 'IconKey1',
      colorKey: 'slate',
    })

    await expect(
      callerB.tags.updateOrganizationTag({ organizationTagId: tagA.id, name: 'Hijacked' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })

    const { tags: orgBTags } = await callerB.tags.listOrganizationTags()
    expect(orgBTags.some((t) => t.id === tagA.id)).toBe(false)
  })
})

describe('PROP-02: Bulk-set catalog tags on a property', () => {
  it('setPropertyTags replaces catalog-backed property tags without touching freeform tags', async () => {
    const { caller } = await setupOwner('tagbulk@test.local')
    const { property } = await caller.properties.create({ name: 'Bulk Tag Property' })

    const { tag: freeform } = await caller.tags.addFreeform({
      propertyId: property.id,
      label: 'Keep Freeform',
      iconKey: 'IconHeart',
      colorKey: 'red',
    })

    const { tag: catalogTagOne } = await caller.tags.createOrganizationTag({
      name: 'CatalogOne',
      iconKey: 'IconBolt',
      colorKey: 'amber',
    })
    const { tag: catalogTagTwo } = await caller.tags.createOrganizationTag({
      name: 'CatalogTwo',
      iconKey: 'IconCircleCheck',
      colorKey: 'green',
    })

    await caller.tags.setPropertyTags({ propertyId: property.id, organizationTagIds: [catalogTagOne.id] })
    let { tags } = await caller.tags.listPropertyTags({ propertyId: property.id })
    expect(tags.map((t) => t.organizationTagId).filter(Boolean)).toEqual([catalogTagOne.id])
    expect(tags.some((t) => t.id === freeform.id)).toBe(true)

    ;({ tags } = await caller.tags.setPropertyTags({
      propertyId: property.id,
      organizationTagIds: [catalogTagTwo.id],
    }))
    expect(tags.map((t) => t.organizationTagId).filter(Boolean)).toEqual([catalogTagTwo.id])

    const listed = await caller.tags.listPropertyTags({ propertyId: property.id })
    expect(listed.tags.some((t) => t.id === freeform.id)).toBe(true)
    expect(listed.tags.map((t) => t.organizationTagId).filter(Boolean)).toEqual([catalogTagTwo.id])
  })
})

describe('PROP-02: me.get quota reflects live property/unit counts (D-41)', () => {
  it('counts.properties and counts.units match active rows after creates, and exclude archived rows', async () => {
    const { caller } = await setupOwner('tagquota@test.local')

    const before = await caller.me.get()
    expect(before.org.quota.properties.count).toBe(0)
    expect(before.org.quota.units.count).toBe(0)

    const { property } = await caller.properties.create({ name: 'Quota Property' })
    await caller.units.create({ propertyId: property.id, label: 'Quota Unit', baseRentCents: 150000 })

    const afterCreate = await caller.me.get()
    expect(afterCreate.org.quota.properties.count).toBe(1)
    expect(afterCreate.org.quota.units.count).toBe(1)

    // D-31 cascade archive — archiving the property also archives its unit; both counts drop.
    await caller.properties.archive({ propertyId: property.id })

    const afterArchive = await caller.me.get()
    expect(afterArchive.org.quota.properties.count).toBe(0)
    expect(afterArchive.org.quota.units.count).toBe(0)
  })
})
