import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@villuh/db/schema/index'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll } from 'vitest'

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
