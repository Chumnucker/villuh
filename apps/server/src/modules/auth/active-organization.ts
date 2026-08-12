import { sql } from 'drizzle-orm'
import { db } from '../../db/index.js'

function firstRow<T>(result: unknown): T | undefined {
  if (Array.isArray(result)) return result[0] as T
  if (
    result &&
    typeof result === 'object' &&
    'rows' in result &&
    Array.isArray((result as { rows: unknown }).rows)
  ) {
    return (result as { rows: T[] }).rows[0]
  }
  return undefined
}

/** First org membership for a user. Used only when creating a session. */
export async function resolveFirstOrganizationId(userId: string): Promise<string | undefined> {
  const result = await db.execute(
    sql`SELECT organization_id FROM "member" WHERE user_id = ${userId} LIMIT 1`,
  )
  return firstRow<{ organization_id: string }>(result)?.organization_id
}
