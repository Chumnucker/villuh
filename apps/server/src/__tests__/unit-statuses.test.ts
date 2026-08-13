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

describe('UNIT-02: Unit status catalog seeding (D-26, Pattern 6)', () => {
  it('unitStatuses.list seeds Available/Occupied/Maintenance with is_system=true on first read', async () => {
    const { caller } = await setupOwner('statusseed@test.local')
    const { statuses } = await caller.unitStatuses.list()

    expect(statuses).toHaveLength(3)
    expect(statuses.map((s) => s.name).sort()).toEqual(['Available', 'Maintenance', 'Occupied'])
    expect(statuses.every((s) => s.isSystem)).toBe(true)
  })

  it('seeding is idempotent — calling list again does not duplicate the default statuses', async () => {
    const { caller } = await setupOwner('statusidem@test.local')
    await caller.unitStatuses.list()
    const { statuses } = await caller.unitStatuses.list()

    expect(statuses).toHaveLength(3)
  })
})

describe('UNIT-02: Admin-only catalog mutations (D-27)', () => {
  it('owner/admin can create, rename, reorder, and archive a custom unit status', async () => {
    const { caller } = await setupOwner('statusadmin@test.local')

    const { status } = await caller.unitStatuses.create({
      name: 'Renovating',
      iconKey: 'IconWrench',
      colorKey: 'violet',
    })
    expect(status.name).toBe('Renovating')
    expect(status.isSystem).toBe(false)

    const { status: renamed } = await caller.unitStatuses.update({ statusId: status.id, name: 'Under Renovation' })
    expect(renamed.name).toBe('Under Renovation')

    const { statuses: beforeReorder } = await caller.unitStatuses.list()
    const reorderedIds = [...beforeReorder].reverse().map((s) => s.id)
    await caller.unitStatuses.reorder({ statusIds: reorderedIds })
    const { statuses: afterReorder } = await caller.unitStatuses.list()
    expect(afterReorder[0]?.id).toBe(reorderedIds[0])

    const { status: archived } = await caller.unitStatuses.archive({ statusId: status.id })
    expect(archived.archivedAt).toBeTruthy()

    const { statuses: afterArchive } = await caller.unitStatuses.list()
    expect(afterArchive.some((s) => s.id === status.id)).toBe(false)
  })

  it('manager (write, not admin) is forbidden from mutating the status catalog', async () => {
    const { caller, userId, orgId } = await setupOwner('statusmanager@test.local')
    await caller.unitStatuses.list() // seed defaults first
    await setRole(userId, orgId, 'manager')

    await expect(
      caller.unitStatuses.create({ name: 'Blocked', iconKey: 'IconFlag', colorKey: 'red' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('viewer is forbidden from mutating the status catalog', async () => {
    const { caller, userId, orgId } = await setupOwner('statusviewer@test.local')
    await caller.unitStatuses.list()
    await setRole(userId, orgId, 'viewer')

    await expect(
      caller.unitStatuses.create({ name: 'Blocked', iconKey: 'IconFlag', colorKey: 'red' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('rejects an off-palette icon/color before it reaches the tag_icon/tag_color enums', async () => {
    const { caller } = await setupOwner('statuspalette@test.local')

    await expect(
      caller.unitStatuses.create({
        name: 'Bad palette',
        // @ts-expect-error -- deliberately outside the locked palette (D-21)
        iconKey: 'IconNotReal',
        colorKey: 'red',
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })

    await expect(
      caller.unitStatuses.create({
        name: 'Bad palette',
        iconKey: 'IconFlag',
        // @ts-expect-error -- deliberately outside the locked palette (D-21)
        colorKey: '#ff00ff',
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })
})

describe('UNIT-02: Status assignment vs catalog management (D-28)', () => {
  it('any write-permission role can assign an existing status to a unit', async () => {
    const { caller, userId, orgId } = await setupOwner('statusassign@test.local')
    const { property } = await caller.properties.create({ name: 'Assign Property' })
    const { statuses } = await caller.unitStatuses.list()
    const occupied = statuses.find((s) => s.name === 'Occupied')

    await setRole(userId, orgId, 'manager') // manager has write, not admin

    const { unit } = await caller.units.create({
      propertyId: property.id,
      label: 'Unit 1',
      baseRentCents: 100000,
      statusId: occupied?.id,
    })
    expect(unit.statusId).toBe(occupied?.id)
  })
})
