import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../schema/index.js'
import { sql } from 'drizzle-orm'

// OWNER CONNECTION — bypasses RLS; use only for seeding and reading audit rows
// Uses DATABASE_OWNER_TEST_URL (owner role on villuh_test) so seeding and assertions
// hit the same database as the app client (DATABASE_TEST_URL on villuh_test).
// NEVER use for RLS assertions — owner silently bypasses all policies
export function createOwnerClient() {
  const url = process.env.DATABASE_OWNER_TEST_URL ?? process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_OWNER_TEST_URL or DATABASE_URL is required (owner role for seeding)')
  }
  const client = postgres(url, { max: 1 })
  return {
    db: drizzle({ client, schema }),
    end: () => client.end(),
  }
}

// RESTRICTED CONNECTION — connects as villuh_app; RLS is enforced on this connection
export function createAppClient() {
  if (!process.env.DATABASE_TEST_URL) {
    throw new Error('DATABASE_TEST_URL is required (villuh_app role for RLS tests)')
  }
  const client = postgres(process.env.DATABASE_TEST_URL, { max: 5 })
  return {
    db: drizzle({ client, schema }),
    client,
    end: () => client.end(),
  }
}

// Replicates withTenant from @villuh/server — avoids cross-package coupling in tests
export async function withTestTenant<T>(
  appDb: ReturnType<typeof createAppClient>['db'],
  landlordId: string,
  actorId: string = 'system',
  fn: (tx: Parameters<Parameters<ReturnType<typeof createAppClient>['db']['transaction']>[0]>[0]) => Promise<T>
): Promise<T> {
  return appDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_landlord_id', ${landlordId}, TRUE)`)
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${actorId}, TRUE)`)
    return fn(tx)
  })
}
