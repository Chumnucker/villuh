import { Hono } from 'hono'
import { z } from 'zod/v4'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { authMiddleware, type AuthVariables } from '../middleware/auth.js'
import { requireTenant } from '../middleware/require-tenant.js'
import { requirePermission } from '../middleware/require-permission.js'
import { rolePermissions } from '@villuh/db/schema/role-permissions'
import { withTenant } from '../lib/tenant.js'

const updateSchema = z.object({
  role: z.enum(['owner', 'manager', 'viewer']),
  action: z.enum(['write', 'financial', 'communications', 'admin']),
  allowed: z.boolean(),
})

export const rolePerms = new Hono<{ Variables: AuthVariables }>()
  .get('/', authMiddleware, async (c) => {
    const { landlordId, userId } = await requireTenant(c)
    return withTenant(landlordId, userId, async (tx) => {
      const rows = await tx
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.landlordId, landlordId))
      return c.json({ permissions: rows })
    })
  })
  .put(
    '/',
    authMiddleware,
    requirePermission('admin'),
    zValidator('json', updateSchema),
    async (c) => {
      const { landlordId, userId } = await requireTenant(c)
      const { role, action, allowed } = c.req.valid('json')

      // D-09: owner permissions are not configurable (always all true). Reject changes targeting owner.
      if (role === 'owner') {
        return c.json({ error: 'Owner permissions are not configurable' }, 400)
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
      return c.json({ ok: true })
    },
  )
