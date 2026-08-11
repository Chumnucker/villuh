import { sql } from 'drizzle-orm'
import { db, type OrganizationTx } from './client.js'

/**
 * Wraps a DB operation in a transaction with organization + actor context via SET LOCAL.
 * TRUE = transaction-local — resets on commit/rollback (safe with PgBouncer).
 * NEVER use FALSE (session-scoped) — leaks org context across pooled connections.
 */
export async function withOrganization<T>(
  organizationId: string,
  actorId: string = 'system',
  fn: (tx: OrganizationTx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_organization_id', ${organizationId}, TRUE)`)
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${actorId}, TRUE)`)
    return fn(tx)
  })
}

export type { OrganizationTx }
