import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { router, protectedProcedure } from '../trpc.js'
import { withTenant } from '../lib/tenant.js'

export const auditLogRouter = router({
  list: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(25),
    }))
    .query(async ({ ctx, input }) => {
      const { landlordId, userId } = ctx
      const { page, limit } = input
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

        return { entries: rows, page, limit, total }
      })
    }),
})
