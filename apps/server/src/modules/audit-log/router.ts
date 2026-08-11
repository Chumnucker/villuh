import { sql } from 'drizzle-orm'
import { router, protectedProcedure } from '../../trpc.js'
import { withOrganization } from '../../db/index.js'
import { listAuditLogInputSchema } from './schemas.js'

export const auditLogRouter = router({
  list: protectedProcedure
    .input(listAuditLogInputSchema)
    .query(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const { page, limit } = input
      const offset = (page - 1) * limit

      return withOrganization(organizationId, userId, async (tx) => {
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
