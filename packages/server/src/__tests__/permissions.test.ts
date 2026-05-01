import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import {
  signUpTestUser,
  markUserEmailVerified,
  signInTestUser,
  clearTestUsers,
  getCurrentUserId,
  getOrgIdForUser,
  fetchApi,
  createOwnerClient,
} from './setup.js'

vi.mock('../lib/email.js', () => ({
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

/**
 * Helper: sign in + set active org, returning a cookie with activeOrganizationId in session.
 */
async function signInWithActiveOrg(email: string, password: string, orgId: string): Promise<string> {
  const { cookie: signInCookie } = await signInTestUser(email, password)
  const setActiveRes = await fetchApi('/api/auth/organization/set-active', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: signInCookie },
    body: JSON.stringify({ organizationId: orgId }),
  })
  return setActiveRes.headers.get('set-cookie') ?? signInCookie
}

describe('AUTH-02: Configurable role permissions', () => {
  it('default role_permissions are seeded on org creation (D-09)', async () => {
    await signUpTestUser('seed@test.local', 'TestPass123!', 'Seed User')
    const userId = await getCurrentUserId('seed@test.local')
    const orgId = await getOrgIdForUser(userId)

    const owner = createOwnerClient()
    try {
      const rows = (await owner.db.execute(
        sql`SELECT role, action, allowed FROM role_permissions WHERE landlord_id = ${orgId}`,
      )) as unknown as { role: string; action: string; allowed: boolean }[]
      expect(rows.length).toBe(12) // 3 roles × 4 actions
      const find = (role: string, action: string) =>
        rows.find((r) => r.role === role && r.action === action)
      expect(find('owner', 'admin')?.allowed).toBe(true)
      expect(find('manager', 'admin')?.allowed).toBe(false)
      expect(find('manager', 'write')?.allowed).toBe(true)
      expect(find('viewer', 'write')?.allowed).toBe(false)
    } finally {
      await owner.end()
    }
  })

  it('owner role bypasses role_permissions check (D-09)', async () => {
    // Owner can hit /api/role-permissions PUT (admin-only) successfully
    await signUpTestUser('ownerperm@test.local', 'TestPass123!', 'Owner')
    const userId = await getCurrentUserId('ownerperm@test.local')
    await markUserEmailVerified(userId)
    const orgId = await getOrgIdForUser(userId)
    const cookie = await signInWithActiveOrg('ownerperm@test.local', 'TestPass123!', orgId)

    const res = await fetchApi('/api/role-permissions', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ role: 'manager', action: 'admin', allowed: true }),
    })
    expect(res.status).toBe(200)
  })

  it('viewer role denied admin action returns 403 (D-09)', async () => {
    await signUpTestUser('vieweradmin@test.local', 'TestPass123!', 'Viewer Admin Test')
    const userId = await getCurrentUserId('vieweradmin@test.local')
    const orgId = await getOrgIdForUser(userId)
    await markUserEmailVerified(userId)

    // Demote to viewer (override the Better Auth default 'owner' role)
    const owner = createOwnerClient()
    try {
      await owner.db.execute(
        sql`UPDATE "member" SET role = 'viewer' WHERE user_id = ${userId} AND organization_id = ${orgId}`,
      )
    } finally {
      await owner.end()
    }

    const cookie = await signInWithActiveOrg('vieweradmin@test.local', 'TestPass123!', orgId)
    const res = await fetchApi('/api/role-permissions', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ role: 'manager', action: 'admin', allowed: false }),
    })
    expect(res.status).toBe(403)
  })

  it('PUT /api/role-permissions rejects changes to owner role with 400', async () => {
    await signUpTestUser('protectowner@test.local', 'TestPass123!', 'Protect Owner')
    const userId = await getCurrentUserId('protectowner@test.local')
    await markUserEmailVerified(userId)
    const orgId = await getOrgIdForUser(userId)
    const cookie = await signInWithActiveOrg('protectowner@test.local', 'TestPass123!', orgId)

    const res = await fetchApi('/api/role-permissions', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ role: 'owner', action: 'admin', allowed: false }),
    })
    expect(res.status).toBe(400)
  })
})

describe('SETT-01: /api/me response shape', () => {
  it('returns D-44 shape for authenticated owner', async () => {
    await signUpTestUser('me@test.local', 'TestPass123!', 'Me User')
    const userId = await getCurrentUserId('me@test.local')
    await markUserEmailVerified(userId)
    const orgId = await getOrgIdForUser(userId)
    const cookie = await signInWithActiveOrg('me@test.local', 'TestPass123!', orgId)

    const res = await fetchApi('/api/me', { headers: { cookie } })
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body).toHaveProperty('tier')
    expect(body).toHaveProperty('unit_count')
    expect(body).toHaveProperty('unit_limit')
    expect(body).toHaveProperty('property_count')
    expect(body).toHaveProperty('property_limit')
    expect(body).toHaveProperty('member_count')
    expect(body).toHaveProperty('member_limit')
    expect(body).toHaveProperty('subscription_status')
    expect(body).toHaveProperty('permissions')
    const perms = body.permissions as Record<string, boolean>
    expect(perms.admin).toBe(true) // owner — all true
    expect(perms.write).toBe(true)
  })
})
