import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../schema/index.js'
import { sql } from 'drizzle-orm'
// afterAll and beforeAll are re-exported from vitest for use in test files
export { afterAll, beforeAll } from 'vitest'

// Lazy app import to avoid circular dependency issues
async function getApp() {
  const { default: app } = await import('../app.js')
  return app
}

/**
 * Thin wrapper that calls the Express app via an in-process HTTP server.
 * Callers pass a relative path (e.g. '/api/audit-log?page=2&limit=1') and standard RequestInit.
 */
export async function fetchApi(path: string, init: RequestInit = {}): Promise<Response> {
  const { createServer } = await import('node:http')
  const app = await getApp()
  return new Promise<Response>((resolve, reject) => {
    const server = createServer(app)
    server.listen(0, () => {
      const addr = server.address() as { port: number }
      const url = `http://localhost:${addr.port}${path}`
      fetch(url, init)
        .then((res) => { server.close(); resolve(res) })
        .catch((err) => { server.close(); reject(err) })
    })
  })
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

// auth is imported lazily inside helpers to support vi.mock('../modules/email/index.js') in tests:
// vi.mock is hoisted but setupFiles run first, so top-level auth import would capture
// real email functions before the mock can intercept. Lazy import ensures the mock
// is applied before auth's first use.
async function getAuth() {
  const { auth } = await import('../modules/auth/index.js')
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

type TestDb = ReturnType<typeof createAppClient>['db']
export type TestTx = Parameters<Parameters<TestDb['transaction']>[0]>[0]

// Replicate withOrganization from src/db/organization.ts (avoid circular import in tests)
export async function withTestOrganization<T>(
  appDb: TestDb,
  organizationId: string,
  actorId: string = 'system',
  fn: (tx: TestTx) => Promise<T>
): Promise<T> {
  return appDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_organization_id', ${organizationId}, TRUE)`)
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
 * Sign in an existing (verified) user and set their org as active in the DB.
 * Returns a session cookie.
 *
 * active organization check checks session.activeOrganizationId — if null it throws 401.
 * Better Auth auto-creates an org per user in databaseHooks.user.create.after, but
 * the session doesn't have activeOrganizationId set by default. We update the session
 * record directly in the test DB to set activeOrganizationId.
 */
export async function signInTestUser(email: string, password: string) {
  const auth = await getAuth()

  // Sign in
  const signInResponse = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  })
  const cookie = signInResponse.headers.get('set-cookie') ?? ''

  // Update the session's active_organization_id directly in the DB.
  // This is equivalent to calling authClient.organization.setActive() client-side.
  const owner = createOwnerClient()
  try {
    await owner.db.execute(sql`
      UPDATE "session" s
      SET active_organization_id = m.organization_id
      FROM "member" m
      JOIN "user" u ON u.email = ${email} AND u.id = m.user_id
      WHERE s.user_id = u.id AND s.token IS NOT NULL
    `)
  } finally {
    await owner.end()
  }

  return { cookie }
}

/**
 * Build a tRPC server-side caller authenticated as the given session cookie.
 * Bypasses the HTTP/Express layer entirely (no batch-link envelope to construct) —
 * this is the standard way to exercise tRPC procedures directly in integration tests.
 */
export async function createTrpcCaller(cookie: string) {
  const auth = await getAuth()
  const headers = new Headers({ cookie })
  const session = await auth.api.getSession({ headers })
  const { appRouter } = await import('../router.js')
  // req/res are unused by the procedures under test — empty stubs are fine.
  return appRouter.createCaller({
    req: {} as unknown as import('express').Request,
    res: {} as unknown as import('express').Response,
    headers,
    user: session?.user ?? null,
    session: session?.session ?? null,
  })
}

// Test data cleanup helpers — Plan 02+ will populate these as auth tables exist
export async function clearTestUsers() {
  const owner = createOwnerClient()
  try {
    // TRUNCATE (not DELETE) — audit_log_organization_id_fkey is ON DELETE CASCADE (migration
    // 0011), but audit_log rows are immutable (BEFORE DELETE trigger raises unconditionally,
    // even for the owner role). DELETE FROM organization would cascade into a blocked DELETE
    // on audit_log and fail every test file's cleanup once any audited table (role_permissions,
    // properties, units, ...) has rows for a real org. TRUNCATE bypasses per-row triggers.
    await owner.db.execute(sql`TRUNCATE audit_log`)
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

/**
 * Sign in and activate the user's organization in the session.
 * Better Auth session.activeOrganizationId is null until setActiveOrganization is called.
 * This is required for protectedProcedure org check to work in integration tests.
 * Returns the session cookie with the active org set.
 */
export async function signInAndActivateOrg(email: string, password: string): Promise<{ cookie: string }> {
  const auth = await getAuth()

  // Step 1: sign in to get session token
  const signInResponse = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  })
  const signInCookie = signInResponse.headers.get('set-cookie') ?? ''

  // Step 2: look up user + org from DB
  const owner = createOwnerClient()
  let orgId = ''
  try {
    const userRows = (await owner.db.execute(
      sql`SELECT id FROM "user" WHERE email = ${email}`,
    )) as unknown as { id: string }[]
    const userId = userRows[0]?.id ?? ''
    if (userId) {
      const memberRows = (await owner.db.execute(
        sql`SELECT organization_id FROM "member" WHERE user_id = ${userId} LIMIT 1`,
      )) as unknown as { organization_id: string }[]
      orgId = memberRows[0]?.organization_id ?? ''
    }
  } finally {
    await owner.end()
  }

  if (!orgId) return { cookie: signInCookie }

  // Step 3: call setActiveOrganization to set activeOrganizationId on the session
  const activateResponse = await auth.api.setActiveOrganization({
    body: { organizationId: orgId },
    headers: { cookie: signInCookie },
    asResponse: true,
  })
  // The response sets a new cookie with the updated session
  const activateCookie = activateResponse.headers.get('set-cookie') ?? signInCookie
  return { cookie: activateCookie }
}
