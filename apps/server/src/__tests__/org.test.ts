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

describe('AUTH-02: Org auto-creation on signup', () => {
  it('user signup auto-creates an organization with user as owner (D-01)', async () => {
    const { user } = await signUpTestUser('orgcreate@test.local', 'TestPass123!', 'Org Creator')
    const orgId = await getOrgIdForUser(user.id)
    expect(orgId).toBeTruthy()
  })
})

describe('AUTH-02: Team invitations', () => {
  it('owner can invite a member with role=manager (D-14) and Resend email is dispatched', async () => {
    await signUpTestUser('inviter@test.local', 'TestPass123!', 'Inviter')
    const inviterId = await getCurrentUserId('inviter@test.local')
    await markUserEmailVerified(inviterId)
    const { cookie } = await signInTestUser('inviter@test.local', 'TestPass123!')

    // Set the active organization (required for requireTenant)
    const orgId = await getOrgIdForUser(inviterId)
    const setActiveRes = await fetchApi('/api/auth/organization/set-active', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ organizationId: orgId }),
    })
    const activeSetCookie = setActiveRes.headers.get('set-cookie') ?? cookie
    const sessionCookie = activeSetCookie || cookie

    const { sendInvitationEmail } = await import('../lib/email.js')
    const res = await fetchApi('/api/team/invitations', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: sessionCookie },
      body: JSON.stringify({ email: 'invitee@test.local', role: 'manager' }),
    })
    expect(res.status).toBe(200)
    expect(sendInvitationEmail).toHaveBeenCalled()
  })

  it('returns 402 PLAN_LIMIT when starter tier member limit (2) is reached', async () => {
    await signUpTestUser('limit@test.local', 'TestPass123!', 'Limit Owner')
    const ownerId = await getCurrentUserId('limit@test.local')
    await markUserEmailVerified(ownerId)
    const { cookie: signInCookie } = await signInTestUser('limit@test.local', 'TestPass123!')

    // Force tier=starter on the org (default is 'trial' which uses pro limits per D-19)
    const orgId = await getOrgIdForUser(ownerId)
    const owner = createOwnerClient()
    try {
      await owner.db.execute(
        sql`UPDATE organization SET subscription_tier = 'starter' WHERE id = ${orgId}`,
      )
    } finally {
      await owner.end()
    }

    // Set active org to get proper session with activeOrganizationId
    const setActiveRes = await fetchApi('/api/auth/organization/set-active', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: signInCookie },
      body: JSON.stringify({ organizationId: orgId }),
    })
    const activeSetCookie = setActiveRes.headers.get('set-cookie') ?? signInCookie
    const cookie = activeSetCookie || signInCookie

    // Owner is 1 member; starter allows 2; first pending invitation = 2nd slot consumed
    const r1 = await fetchApi('/api/team/invitations', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ email: 'first@test.local', role: 'viewer' }),
    })
    expect(r1.status).toBe(200)

    // Second invitation should hit the limit (1 member + 1 pending >= 2)
    const r2 = await fetchApi('/api/team/invitations', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ email: 'second@test.local', role: 'viewer' }),
    })
    expect(r2.status).toBe(402)
    const text = await r2.text()
    expect(text).toContain('PLAN_LIMIT')
    expect(text).toContain('members')
  })
})
