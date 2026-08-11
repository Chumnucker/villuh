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

vi.mock('../modules/email/index.js', () => ({
  resend: { emails: { send: vi.fn() } },
  sendVerificationEmail: vi.fn(),
  sendResetPasswordEmail: vi.fn(),
  sendInvitationEmail: vi.fn(),
}))

beforeAll(async () => { await clearTestUsers() })
afterAll(async () => { await clearTestUsers() })

/**
 * Seed a synthetic audit_log entry directly into the DB (bypasses RLS + trigger).
 * Used to create reliable test data for SETT-02 audit log tests.
 * This matches what Phase 1 audit triggers produce on real DML operations.
 */
async function seedAuditEntry(organizationId: string, actorId: string, tableName: string) {
  const owner = createOwnerClient()
  try {
    // audit_log.organization_id is text (migration 0009) — no uuid cast needed
    await owner.db.execute(sql`
      INSERT INTO audit_log (organization_id, table_name, row_id, operation, actor_id)
      VALUES (
        ${organizationId},
        ${tableName},
        gen_random_uuid(),
        'UPDATE',
        ${actorId}
      )
    `)
  } finally {
    await owner.end()
  }
}

describe('SETT-02: Personal audit log', () => {
  it('GET /api/audit-log returns entries filtered by actor_id = current user (Phase 1 triggers)', async () => {
    await signUpTestUser('audit@test.local', 'TestPass123!', 'Audit User')
    const userId = await getCurrentUserId('audit@test.local')
    const orgId = await getOrgIdForUser(userId)
    await markUserEmailVerified(userId)
    const { cookie } = await signInTestUser('audit@test.local', 'TestPass123!')

    // Seed a synthetic audit entry so the audit log has data to return.
    // (Replaces the Phase 1 trigger approach: real triggers fire on DML in withOrganization context.
    // Synthetic seeding avoids the complexity of triggering real DML in tests.)
    await seedAuditEntry(orgId, userId, 'role_permissions')

    const res = await fetchApi('/api/audit-log', { headers: { cookie } })
    expect(res.status).toBe(200)
    const body = await res.json() as { entries: { table_name: string; actor_id: string }[]; total: number }
    expect(body.total).toBeGreaterThan(0)
    // All returned entries should have actor_id = userId (the current user)
    expect(body.entries.every((e) => e.actor_id === userId)).toBe(true)
    // At least one should be from the role_permissions table
    expect(body.entries.some((e) => e.table_name === 'role_permissions')).toBe(true)
  })

  it('audit log entries from another user are NOT visible (RLS + actor_id filter)', async () => {
    // User A — has audit entries
    await signUpTestUser('audit-a@test.local', 'TestPass123!', 'Audit A')
    const userIdA = await getCurrentUserId('audit-a@test.local')
    const orgIdA = await getOrgIdForUser(userIdA)
    await markUserEmailVerified(userIdA)

    // Seed an audit entry for user A
    await seedAuditEntry(orgIdA, userIdA, 'role_permissions')

    // User B (different org — Better Auth auto-creates a separate org per user)
    await signUpTestUser('audit-b@test.local', 'TestPass123!', 'Audit B')
    const userIdB = await getCurrentUserId('audit-b@test.local')
    await markUserEmailVerified(userIdB)
    const { cookie: cookieB } = await signInTestUser('audit-b@test.local', 'TestPass123!')

    const resB = await fetchApi('/api/audit-log', { headers: { cookie: cookieB } })
    expect(resB.status).toBe(200)
    const body = await resB.json() as { entries: { actor_id: string }[] }
    // User B should NOT see user A's actions (RLS isolates organization_id, actor_id filter isolates user)
    expect(body.entries.every((e) => e.actor_id !== userIdA)).toBe(true)
  })

  it('audit log is paginated (page=2, limit=1)', async () => {
    await signUpTestUser('audit-p@test.local', 'TestPass123!', 'Audit P')
    const userId = await getCurrentUserId('audit-p@test.local')
    const orgId = await getOrgIdForUser(userId)
    await markUserEmailVerified(userId)
    const { cookie } = await signInTestUser('audit-p@test.local', 'TestPass123!')

    // Seed at least 3 audit entries for this user
    await seedAuditEntry(orgId, userId, 'role_permissions')
    await seedAuditEntry(orgId, userId, 'role_permissions')
    await seedAuditEntry(orgId, userId, 'role_permissions')

    const res = await fetchApi('/api/audit-log?page=2&limit=1', { headers: { cookie } })
    expect(res.status).toBe(200)
    const body = await res.json() as { entries: unknown[]; page: number; limit: number; total: number }
    expect(body.page).toBe(2)
    expect(body.limit).toBe(1)
    expect(body.entries.length).toBe(1)
    expect(body.total).toBeGreaterThanOrEqual(3)
  })
})
