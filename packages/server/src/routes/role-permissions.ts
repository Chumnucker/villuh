import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware, type AuthVariables } from '../middleware/auth.js'
import { requireTenant } from '../middleware/require-tenant.js'
import { withTenant } from '../lib/tenant.js'
import { rolePermissions } from '@villuh/db/schema/role-permissions'
import { eq, and } from 'drizzle-orm'

const updateSchema = z.object({
  role: z.enum(['owner', 'manager', 'viewer']),
  action: z.enum(['write', 'financial', 'communications', 'admin']),
  allowed: z.boolean(),
})

/**
 * Role permissions endpoints (AUTH-02, SETT-01).
 *
 * NOTE: Full RBAC enforcement (requirePermission('admin') guard + owner-role protection)
 * is implemented in Plan 02-04. This module provides the minimal functional implementation
 * needed for Wave 3 parallel execution (the audit-log tests in Plan 02-07 need this route
 * to exist so they can generate audit log entries for the test DB).
 *
 * Plan 02-04 will replace/override this file with the full implementation.
 *
 * GET /api/role-permissions  — list all role × action permission rows for the active org
 * PUT /api/role-permissions  — upsert a single role × action row (owner only)
 */
export const rolePerms = new Hono<{ Variables: AuthVariables }>()
  .get('/', authMiddleware, async (c) => {
    const { landlordId, userId } = await requireTenant(c)
    return withTenant(landlordId, userId, async (tx) => {
      const rows = await tx.select().from(rolePermissions).where(
        eq(rolePermissions.landlordId, landlordId)
      )
      return c.json({ permissions: rows })
    })
  })
  .put(
    '/',
    authMiddleware,
    zValidator('json', updateSchema),
    async (c) => {
      const { landlordId, userId } = await requireTenant(c)
      const { role, action, allowed } = c.req.valid('json')

      // D-09: owner permissions are not configurable (always all true).
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
    }
  )
