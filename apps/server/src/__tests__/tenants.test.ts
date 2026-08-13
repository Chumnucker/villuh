import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'
import { withOrganization } from '../db/index.js'
import {
  createTenant,
  createTenancy,
  addCoTenant,
  removeMember,
  endTenancy,
  listTenants,
  getTenant,
  archiveTenant,
  getTenantActivity,
  getUnitTenancyHistory,
} from '../modules/tenants/service.js'
import { archiveUnit } from '../modules/units/service.js'
import { archiveProperty } from '../modules/properties/service.js'
import {
  signUpTestUser,
  markUserEmailVerified,
  signInAndActivateOrg,
  clearTestUsers,
  getCurrentUserId,
  getOrgIdForUser,
  createTrpcCaller,
} from './setup.js'

// Stripe is mocked because unit creation calls the metered-billing sync (Pattern 8) —
// keep it hermetic like units.test.ts / floor-plans.test.ts.
vi.mock('stripe', () => {
  class MockStripe {
    subscriptions = { update: vi.fn().mockResolvedValue({ status: 'active' }) }
  }
  return { default: MockStripe, Stripe: MockStripe }
})

vi.mock('../modules/email/index.js', () => ({
  resend: { emails: { send: vi.fn().mockResolvedValue({ id: 'mock' }) } },
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendResetPasswordEmail: vi.fn().mockResolvedValue(undefined),
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}))

let orgId: string
let userId: string
let caller: Awaited<ReturnType<typeof createTrpcCaller>>
let propertyId: string
let unitId: string

beforeAll(async () => {
  await clearTestUsers()
  const email = 'tenants-owner@test.local'
  await signUpTestUser(email, 'TestPass123!', 'Owner')
  userId = await getCurrentUserId(email)
  await markUserEmailVerified(userId)
  const { cookie } = await signInAndActivateOrg(email, 'TestPass123!')
  caller = await createTrpcCaller(cookie)
  orgId = await getOrgIdForUser(userId)

  const { property } = await caller.properties.create({ name: 'Tenant Slice Property' })
  propertyId = property.id
})

afterAll(async () => {
  await clearTestUsers()
})

// A fresh unit per test so the `one active tenancy per unit` partial index never
// clashes across cases (each test may create an active tenancy on its own unit).
beforeEach(async () => {
  const { unit } = await caller.units.create({
    propertyId,
    label: `Unit ${crypto.randomUUID().slice(0, 8)}`,
    baseRentCents: 100000,
  })
  unitId = unit.id
})

describe('tenants service', () => {
  it('creates a tenant and lists it as Unassigned', async () => {
    await withOrganization(orgId, userId, async (tx) => {
      const t = await createTenant(tx, orgId, { firstName: 'Jane', lastName: 'Doe', email: 'jane@x.com' })
      const { tenants } = await listTenants(tx, orgId)
      const row = tenants.find((r) => r.id === t.id)!
      expect(row.currentUnit).toBeNull()
      expect(row.tenancyStatus).toBeNull()
    })
  })

  it('rejects a second active tenancy on the same unit', async () => {
    await withOrganization(orgId, userId, async (tx) => {
      const a = await createTenant(tx, orgId, { firstName: 'A', lastName: 'A', email: 'a@x.com' })
      const b = await createTenant(tx, orgId, { firstName: 'B', lastName: 'B', email: 'b@x.com' })
      await createTenancy(tx, orgId, { unitId, status: 'active', memberTenantIds: [a.id], primaryTenantId: a.id })
      await expect(
        createTenancy(tx, orgId, { unitId, status: 'active', memberTenantIds: [b.id], primaryTenantId: b.id }),
      ).rejects.toThrow(/active tenancy/i)
    })
  })

  it('supports co-tenants and blocks removing the primary', async () => {
    await withOrganization(orgId, userId, async (tx) => {
      const a = await createTenant(tx, orgId, { firstName: 'A', lastName: 'A', email: 'a2@x.com' })
      const b = await createTenant(tx, orgId, { firstName: 'B', lastName: 'B', email: 'b2@x.com' })
      const ten = await createTenancy(tx, orgId, { unitId, status: 'pending', memberTenantIds: [a.id], primaryTenantId: a.id })
      await addCoTenant(tx, orgId, { tenancyId: ten.id, tenantId: b.id })
      await expect(removeMember(tx, orgId, { tenancyId: ten.id, tenantId: a.id })).rejects.toThrow(/primary/i)
      await removeMember(tx, orgId, { tenancyId: ten.id, tenantId: b.id }) // co-tenant removal ok
    })
  })

  it('endTenancy sets ended + archivedAt and retains the row', async () => {
    await withOrganization(orgId, userId, async (tx) => {
      const a = await createTenant(tx, orgId, { firstName: 'A', lastName: 'A', email: 'a3@x.com' })
      const ten = await createTenancy(tx, orgId, { unitId, status: 'active', memberTenantIds: [a.id], primaryTenantId: a.id })
      const ended = await endTenancy(tx, orgId, ten.id)
      expect(ended.status).toBe('ended')
      expect(ended.archivedAt).not.toBeNull()
    })
  })

  it('rejects a cross-org unit and a primary not in members', async () => {
    await withOrganization(orgId, userId, async (tx) => {
      const a = await createTenant(tx, orgId, { firstName: 'A', lastName: 'A', email: 'a4@x.com' })
      await expect(
        createTenancy(tx, orgId, { unitId: crypto.randomUUID(), memberTenantIds: [a.id], primaryTenantId: a.id }),
      ).rejects.toThrow(/unit not found/i)
      await expect(
        createTenancy(tx, orgId, { unitId, memberTenantIds: [a.id], primaryTenantId: crypto.randomUUID() }),
      ).rejects.toThrow(/primary/i)
    })
  })

  it('lists an active tenancy with its current unit and status', async () => {
    await withOrganization(orgId, userId, async (tx) => {
      const a = await createTenant(tx, orgId, { firstName: 'Cur', lastName: 'Rent', email: 'current@x.com' })
      await createTenancy(tx, orgId, { unitId, status: 'active', memberTenantIds: [a.id], primaryTenantId: a.id })
      const { tenants } = await listTenants(tx, orgId)
      const row = tenants.find((r) => r.id === a.id)!
      expect(row.currentUnit?.id).toBe(unitId)
      expect(row.tenancyStatus).toBe('active')
    })
  })

  it('getTenant returns the tenant with its tenancies and members', async () => {
    await withOrganization(orgId, userId, async (tx) => {
      const a = await createTenant(tx, orgId, { firstName: 'Det', lastName: 'Ail', email: 'detail@x.com' })
      const b = await createTenant(tx, orgId, { firstName: 'Co', lastName: 'Ten', email: 'coten@x.com' })
      const ten = await createTenancy(tx, orgId, { unitId, status: 'pending', memberTenantIds: [a.id], primaryTenantId: a.id })
      await addCoTenant(tx, orgId, { tenancyId: ten.id, tenantId: b.id })

      const detail = await getTenant(tx, orgId, a.id)
      expect(detail.tenant.id).toBe(a.id)
      expect(detail.tenancies).toHaveLength(1)
      expect(detail.tenancies[0]!.unit.id).toBe(unitId)
      expect(detail.tenancies[0]!.members.map((m) => m.tenantId).sort()).toEqual([a.id, b.id].sort())
      expect(detail.tenancies[0]!.members.find((m) => m.tenantId === a.id)!.isPrimary).toBe(true)
    })
  })

  it('archiveTenant hides the tenant from the default list', async () => {
    await withOrganization(orgId, userId, async (tx) => {
      const a = await createTenant(tx, orgId, { firstName: 'Arch', lastName: 'Ive', email: 'archive@x.com' })
      const archived = await archiveTenant(tx, orgId, a.id)
      expect(archived.archivedAt).not.toBeNull()
      const { tenants } = await listTenants(tx, orgId)
      expect(tenants.some((r) => r.id === a.id)).toBe(false)
    })
  })

  it('blocks archiving a unit with an active tenancy until it is ended (spec guard #6)', async () => {
    await withOrganization(orgId, userId, async (tx) => {
      const a = await createTenant(tx, orgId, { firstName: 'Occ', lastName: 'Upied', email: 'occupied@x.com' })
      const ten = await createTenancy(tx, orgId, { unitId, status: 'active', memberTenantIds: [a.id], primaryTenantId: a.id })

      await expect(archiveUnit(tx, orgId, unitId)).rejects.toThrow(/end the active tenancy/i)

      await endTenancy(tx, orgId, ten.id)
      const archived = await archiveUnit(tx, orgId, unitId)
      expect(archived.archivedAt).not.toBeNull()
    })
  })

  it("blocks archiving a property while one of its units has an active tenancy (spec guard #6)", async () => {
    const { property } = await caller.properties.create({ name: 'Occupied Property' })
    const { unit } = await caller.units.create({ propertyId: property.id, label: 'Occ Unit', baseRentCents: 100000 })

    await withOrganization(orgId, userId, async (tx) => {
      const a = await createTenant(tx, orgId, { firstName: 'Prop', lastName: 'Occ', email: 'propocc@x.com' })
      const ten = await createTenancy(tx, orgId, { unitId: unit.id, status: 'active', memberTenantIds: [a.id], primaryTenantId: a.id })

      await expect(archiveProperty(tx, orgId, property.id)).rejects.toThrow(/active tenanc/i)

      await endTenancy(tx, orgId, ten.id)
      const result = await archiveProperty(tx, orgId, property.id)
      expect(result.property.archivedAt).not.toBeNull()
    })
  })

  it('unit tenancy history returns ended + active, active first, with members (UNIT-04)', async () => {
    await withOrganization(orgId, userId, async (tx) => {
      const past = await createTenant(tx, orgId, { firstName: 'Past', lastName: 'Tenant', email: 'pasthist@x.com' })
      const current = await createTenant(tx, orgId, { firstName: 'Cur', lastName: 'Tenant', email: 'currhist@x.com' })

      const ended = await createTenancy(tx, orgId, { unitId, status: 'active', memberTenantIds: [past.id], primaryTenantId: past.id })
      await endTenancy(tx, orgId, ended.id)
      await createTenancy(tx, orgId, { unitId, status: 'active', memberTenantIds: [current.id], primaryTenantId: current.id })

      const history = await getUnitTenancyHistory(tx, orgId, unitId)
      expect(history).toHaveLength(2)
      expect(history[0]!.status).toBe('active')
      expect(history[1]!.status).toBe('ended')
      expect(history[0]!.members.map((m) => m.tenantId)).toContain(current.id)
      expect(history[1]!.members.map((m) => m.tenantId)).toContain(past.id)
      expect(history[0]!.members.find((m) => m.tenantId === current.id)!.isPrimary).toBe(true)
    })
  })

  it('activity timeline surfaces tenant + tenancy + membership events from audit_log', async () => {
    await withOrganization(orgId, userId, async (tx) => {
      const t = await createTenant(tx, orgId, { firstName: 'Log', lastName: 'Ged', email: 'log@x.com' })
      await createTenancy(tx, orgId, { unitId, status: 'pending', memberTenantIds: [t.id], primaryTenantId: t.id })
      const { entries, total } = await getTenantActivity(tx, orgId, { tenantId: t.id, page: 1, limit: 50 })
      expect(total).toBeGreaterThanOrEqual(2) // tenant INSERT + membership INSERT (+ tenancy INSERT)
      expect(entries.some((e) => e.tableName === 'tenants' && e.operation === 'INSERT')).toBe(true)
      expect(entries.some((e) => e.tableName === 'tenancy_members')).toBe(true)
    })
  })
})
