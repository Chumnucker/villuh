import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware, type AuthVariables } from '../middleware/auth.js'
import { requireTenant } from '../middleware/require-tenant.js'
import { withTenant } from '../lib/tenant.js'
import { sql } from 'drizzle-orm'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

/**
 * GET /api/audit-log — personal activity log for the current user (SETT-02).
 *
 * Security model (T-2-I06):
 *   1. withTenant sets SET LOCAL app.current_landlord_id — Phase 1 RLS policy on audit_log
 *      filters rows to the caller's org (landlord isolation).
 *   2. Explicit WHERE actor_id = ${userId} additionally isolates personal entries from
 *      other team members' actions within the same org.
 *
 * Pagination (T-2-D05):
 *   Bounded by LIMIT (max 100, default 25) and OFFSET to prevent full-table reads.
 */
export const auditLog = new Hono<{ Variables: AuthVariables }>()
  .get('/', authMiddleware, zValidator('query', querySchema), async (c) => {
    const { landlordId, userId } = await requireTenant(c)
    const { page, limit } = c.req.valid('query')
    const offset = (page - 1) * limit

    return withTenant(landlordId, userId, async (tx) => {
      // RLS already filters by landlord_id (Phase 1 tenant_isolation policy);
      // additionally filter by actor_id = userId for personal log (SETT-02).
      const rows = await tx.execute(sql`
        SELECT id, table_name, row_id, operation, old_values, new_values, actor_id, created_at
        FROM audit_log
        WHERE actor_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as unknown as unknown[]

      const totalResult = await tx.execute(sql`
        SELECT COUNT(*)::int AS c FROM audit_log WHERE actor_id = ${userId}
      `) as unknown as { c: number }[]
      const total = totalResult[0]?.c ?? 0

      return c.json({ entries: rows, page, limit, total })
    })
  })
