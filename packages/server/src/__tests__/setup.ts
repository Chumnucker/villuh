import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@villuh/db/schema/index'
import { sql } from 'drizzle-orm'
// afterAll and beforeAll are re-exported from vitest for use in test files
export { afterAll, beforeAll } from 'vitest'

// Lazy app import to avoid circular dependency issues
async function getApp() {
  const { default: app } = await import('../app.js')
  return app
}

/**
 * Thin wrapper around the Hono app's fetch() — no real HTTP, all in-process.
 * Callers pass a relative path (e.g. '/api/audit-log?page=2&limit=1') and standard RequestInit.
 */
export async function fetchApi(path: string, init: RequestInit = {}): Promise<Response> {
  const url = `http://localhost${path}`
  const req = new Request(url, init)
  const app = await getApp()
  return app.fetch(req)
}

/** Look up a user's ID by email from the owner DB (bypasses RLS). */
export async function getCurrentUserId(email: string): Promise<string> {
  const owner = createOwnerClient()
  try {
    const rows = await owner.db.execute(
      sql`SELECT id FROM "user" WHERE email = ${email}`
    ) as unknown as { id: string }[]
    return rows[0]?.id ?? ''
  } finally {
    await owner.end()
  }
}

/** Look up the org ID for a given user (first membership row). */
export async function getOrgIdForUser(userId: string): Promise<string> {
  const owner = createOwnerClient()
  try {
    const rows = await owner.db.execute(
      sql`SELECT organization_id FROM "member" WHERE user_id = ${userId} LIMIT 1`
    ) as unknown as { organization_id: string }[]
    return rows[0]?.organization_id ?? ''
  } finally {
    await owner.end()
  }
}

// auth is imported lazily inside helpers to support vi.mock('../lib/email.js') in tests:
// vi.mock is hoisted but setupFiles run first, so top-level auth import would capture
// real email functions before the mock can intercept. Lazy import ensures the mock
// is applied before auth's first use.
async function getAuth() {
  const { auth } = await import('../auth.js')
  return auth
}

// Owner client for seeding + assertions (bypasses RLS)
export function createOwnerClient() {
  const url = process.env.DATABASE_OWNER_TEST_URL
  if (!url) throw new Error('DATABASE_OWNER_TEST_URL is required')
  const client = postgres(url, { max: 1 })
  return { db: drizzle({ client, schema }), end: () => client.end() }
}

// App client for RLS-enforced queries
export function createAppClient() {
  const url = process.env.DATABASE_TEST_URL
  if (!url) throw new Error('DATABASE_TEST_URL is required')
  const client = postgres(url, { max: 5 })
  return { db: drizzle({ client, schema }), end: () => client.end() }
}

// Replicate withTenant from src/lib/tenant.ts (avoid circular import in tests)
export async function withTestTenant<T>(
  appDb: ReturnType<typeof createAppClient>['db'],
  landlordId: string,
  actorId: string = 'system',
  fn: (tx: any) => Promise<T>
): Promise<T> {
  return appDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_landlord_id', ${landlordId}, TRUE)`)
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${actorId}, TRUE)`)
    return fn(tx)
  })
}

/**
 * Sign up a test user via Better Auth API (auto-creates org via databaseHooks).
 * Returns the created user + their auth session cookie header.
 * Caller must clearTestUsers() in afterAll.
 */
export async function signUpTestUser(email: string, password: string, name: string) {
  const auth = await getAuth()
  const response = await auth.api.signUpEmail({
    body: { email, password, name },
    asResponse: true,
  })
  const cookie = response.headers.get('set-cookie') ?? ''
  const json = await response.json() as { user: { id: string; email: string; emailVerified: boolean } }
  return { user: json.user, cookie }
}

/**
 * Bypass email verification in tests — flip emailVerified=true via owner DB connection.
 */
export async function markUserEmailVerified(userId: string) {
  const owner = createOwnerClient()
  try {
    await owner.db.execute(sql`UPDATE "user" SET email_verified = TRUE WHERE id = ${userId}`)
  } finally {
    await owner.end()
  }
}

/**
 * Sign in an existing (verified) user. Returns the session cookie.
 */
export async function signInTestUser(email: string, password: string) {
  const auth = await getAuth()
  const response = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  })
  const cookie = response.headers.get('set-cookie') ?? ''
  return { cookie }
}

// Test data cleanup helpers — Plan 02+ will populate these as auth tables exist
export async function clearTestUsers() {
  const owner = createOwnerClient()
  try {
    await owner.db.execute(sql`DELETE FROM "session"`)
    await owner.db.execute(sql`DELETE FROM "member"`)
    await owner.db.execute(sql`DELETE FROM "invitation"`)
    await owner.db.execute(sql`DELETE FROM "organization"`)
    await owner.db.execute(sql`DELETE FROM "account"`)
    await owner.db.execute(sql`DELETE FROM "verification"`)
    await owner.db.execute(sql`DELETE FROM "user"`)
    await owner.db.execute(sql`DELETE FROM role_permissions`)
  } finally {
    await owner.end()
  }
}
