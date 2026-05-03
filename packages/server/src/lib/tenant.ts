import { db } from '../db.js'
import { sql } from 'drizzle-orm'

/**
 * Wraps a DB operation in a transaction with tenant + actor context set via SET LOCAL.
 * TRUE makes the setting transaction-local — resets automatically on transaction end.
 * NEVER use FALSE (session-scoped) — it leaks tenant context across PgBouncer pooled connections.
 */
export async function withTenant<T>(
  landlordId: string,
  actorId: string = 'system',
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_landlord_id', ${landlordId}, TRUE)`)
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${actorId}, TRUE)`)
    return fn(tx)
  })
}
