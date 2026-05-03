import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, permissionProcedure } from '../trpc.js'
import { rolePermissions } from '../schema/role-permissions.js'
import { withTenant } from '../lib/tenant.js'

export const rolePermissionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { landlordId, userId } = ctx
    return withTenant(landlordId, userId, async (tx) => {
      const rows = await tx
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.landlordId, landlordId))
      return { permissions: rows }
    })
  }),

  update: permissionProcedure('admin')
    .input(z.object({
      role: z.enum(['owner', 'manager', 'viewer']),
      action: z.enum(['write', 'financial', 'communications', 'admin']),
      allowed: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { landlordId, userId } = ctx
      const { role, action, allowed } = input

      // D-09: owner permissions are not configurable (always all true)
      if (role === 'owner') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Owner permissions are not configurable' })
      }

      await withTenant(landlordId, userId, async (tx) => {
        await tx
          .insert(rolePermissions)
          .values({ landlordId, role, action, allowed })
          .onConflictDoUpdate({
            target: [rolePermissions.landlordId, rolePermissions.role, rolePermissions.action],
            set: { allowed, updatedAt: new Date() },
          })
      })
      return { ok: true }
    }),
})
