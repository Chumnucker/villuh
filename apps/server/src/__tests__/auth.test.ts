import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import {
  createOwnerClient,
  clearTestUsers,
  signUpTestUser,
  markUserEmailVerified,
  signInTestUser,
} from './setup.js'

// Mock Resend so tests don't actually send email
vi.mock('../modules/email/index.js', () => ({
  resend: { emails: { send: vi.fn().mockResolvedValue({ id: 'mock' }) } },
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendResetPasswordEmail: vi.fn().mockResolvedValue(undefined),
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}))

const { sendVerificationEmail, sendResetPasswordEmail } = await import('../modules/email/index.js')

beforeAll(async () => { await clearTestUsers() })
afterAll(async () => { await clearTestUsers() })

describe('AUTH-01: Email/password signup', () => {
  it('signup creates user + organization + sends verification email', async () => {
    const { user } = await signUpTestUser('signup@test.local', 'TestPass123!', 'Signup User')
    expect(user.email).toBe('signup@test.local')
    expect(user.emailVerified).toBe(false)         // D-04: email not verified on signup
    expect(sendVerificationEmail).toHaveBeenCalledWith('signup@test.local', expect.stringContaining('http'))

    // Verify org auto-created (D-01) — query owner DB
    const owner = createOwnerClient()
    try {
      const orgs = await owner.db.execute(
        sql`SELECT id FROM organization WHERE id IN (SELECT organization_id FROM member WHERE user_id = ${user.id})`
      )
      const rowCount = (orgs as unknown as { length?: number; rowCount?: number }).length ??
        (orgs as unknown as { rowCount?: number }).rowCount ?? 0
      expect(rowCount).toBeGreaterThan(0)
    } finally {
      await owner.end()
    }
  })

  it('signup requires email verification before app access (D-04)', async () => {
    const { user } = await signUpTestUser('verify@test.local', 'TestPass123!', 'Verify User')
    // emailVerified must be false immediately after signup
    expect(user.emailVerified).toBe(false)
    // Better Auth's requireEmailVerification flag blocks signin until emailVerified=true
    // Full integration (block app access) is verified in Plan 06 wizard test
  })

  it('login with valid credentials returns session cookie', async () => {
    await signUpTestUser('login@test.local', 'TestPass123!', 'Login User')

    // Get the userId so we can verify email
    const owner = createOwnerClient()
    let userId = ''
    try {
      const rows = await owner.db.execute(
        sql`SELECT id FROM "user" WHERE email = 'login@test.local'`
      ) as unknown as Array<{ id: string }>
      userId = rows[0]!.id
    } finally {
      await owner.end()
    }
    await markUserEmailVerified(userId)

    const { cookie } = await signInTestUser('login@test.local', 'TestPass123!')
    expect(cookie).toContain('better-auth.session_token')   // Better Auth default cookie name
  })
})

describe('AUTH-01: Google OAuth (Plan 03 manual smoke test)', () => {
  it.todo('Google OAuth state param is validated (manual smoke test in Plan 03)')
})

describe('AUTH-09: Password reset', () => {
  it('forgot-password triggers Resend email with reset URL', async () => {
    await signUpTestUser('reset@test.local', 'TestPass123!', 'Reset User')
    const owner = createOwnerClient()
    try {
      const rows = await owner.db.execute(
        sql`SELECT id FROM "user" WHERE email = 'reset@test.local'`
      ) as unknown as Array<{ id: string }>
      await markUserEmailVerified(rows[0]!.id)
    } finally {
      await owner.end()
    }

    // Trigger forgot-password via Better Auth API
    const { auth } = await import('../modules/auth/index.js')
    await auth.api.requestPasswordReset({
      body: { email: 'reset@test.local', redirectTo: 'http://localhost:3000/reset-password' },
    })
    expect(sendResetPasswordEmail).toHaveBeenCalledWith('reset@test.local', expect.stringContaining('http'))
  })
})
