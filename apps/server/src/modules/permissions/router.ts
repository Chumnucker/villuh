import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { router, protectedProcedure, permissionProcedure } from '../../trpc.js'
import { rolePermissions } from '../../schema/role-permissions.js'
import { withOrganization } from '../../db/index.js'
import { zRole, zActionCategory, badRequest } from '../../domain/index.js'

export const rolePermissionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { organizationId, userId } = ctx
    return withOrganization(organizationId, userId, async (tx) => {
      const rows = await tx
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.organizationId, organizationId))
      return { permissions: rows }
    })
  }),

  update: permissionProcedure('admin')
    .input(z.object({
      role: zRole,
      action: zActionCategory,
      allowed: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const { role, action, allowed } = input

      if (role === 'owner') {
        badRequest('Owner permissions are not configurable', 'OWNER_PERMISSIONS_LOCKED')
      }

      await withOrganization(organizationId, userId, async (tx) => {
        await tx
          .insert(rolePermissions)
          .values({ organizationId, role, action, allowed })
          .onConflictDoUpdate({
            target: [rolePermissions.organizationId, rolePermissions.role, rolePermissions.action],
            set: { allowed, updatedAt: new Date() },
          })
      })
      return { ok: true }
    }),
})
