import { Hono } from 'hono'
import { z } from 'zod/v4'
import { zValidator } from '@hono/zod-validator'
import { sql, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { authMiddleware, type AuthVariables } from '../middleware/auth.js'
import { requireTenant } from '../middleware/require-tenant.js'
import { requirePermission } from '../middleware/require-permission.js'
import { auth } from '../auth.js'
import { planLimits } from '@villuh/db/schema/plan-limits'
import { organization } from '@villuh/db/schema/auth'
import { withTenant } from '../lib/tenant.js'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'manager', 'viewer']),
})

const updateRoleSchema = z.object({
  role: z.enum(['owner', 'manager', 'viewer']),
})

export const team = new Hono<{ Variables: AuthVariables }>()
  .get('/members', authMiddleware, async (c) => {
    const { landlordId, userId } = await requireTenant(c)
    return withTenant(landlordId, userId, async (tx) => {
      const rows = await tx.execute(sql`
        SELECT m.id AS member_id, m.role, u.id AS user_id, u.name, u.email, u.image, m.created_at AS joined_at
        FROM "member" m
        JOIN "user" u ON u.id = m.user_id
        WHERE m.organization_id = ${landlordId}
        ORDER BY m.created_at ASC
      `)
      return c.json({ members: rows as unknown[] })
    })
  })
  .get('/invitations', authMiddleware, async (c) => {
    const { landlordId, userId } = await requireTenant(c)
    return withTenant(landlordId, userId, async (tx) => {
      const rows = await tx.execute(sql`
        SELECT id, email, role, status, expires_at, inviter_id
        FROM "invitation"
        WHERE organization_id = ${landlordId} AND status = 'pending'
        ORDER BY expires_at DESC
      `)
      return c.json({ invitations: rows as unknown[] })
    })
  })
  .post(
    '/invitations',
    authMiddleware,
    requirePermission('admin'),
    zValidator('json', inviteSchema),
    async (c) => {
      const { landlordId, userId } = await requireTenant(c)
      const { email, role } = c.req.valid('json')

      // Plan limit check on members (member_limit)
      await withTenant(landlordId, userId, async (tx) => {
        const memberCountRows = (await tx.execute(sql`
          SELECT (
            (SELECT COUNT(*) FROM "member" WHERE organization_id = ${landlordId})
            + (SELECT COUNT(*) FROM "invitation" WHERE organization_id = ${landlordId} AND status = 'pending')
          )::int AS c
        `)) as unknown as { c: number }[]
        const totalMembers = memberCountRows[0]?.c ?? 0

        const orgRows = await tx
          .select()
          .from(organization)
          .where(eq(organization.id, landlordId))
          .limit(1)
        const tier = (orgRows[0]?.subscription_tier as string) ?? 'trial'
        const lookupTier = tier === 'trial' ? 'pro' : tier
        const limitRows = await tx
          .select()
          .from(planLimits)
          .where(sql`tier = ${lookupTier} AND resource = 'members'`)
          .limit(1)
        const limit = limitRows[0]?.limit ?? 2

        if (limit !== -1 && totalMembers >= limit) {
          throw new HTTPException(402, {
            message: JSON.stringify({
              code: 'PLAN_LIMIT',
              resource: 'members',
              limit,
              current: totalMembers,
              upgrade_to: tier === 'starter' ? 'growth' : 'pro',
            }),
          })
        }
      })

      // Better Auth invitation creation — fires sendInvitationEmail callback (Plan 02 wired Resend)
      // Villuh roles (manager, viewer) are custom labels stored on member.role; Better Auth org plugin
      // accepts "owner" | "member" | "admin" at the API level but stores whatever string we pass.
      // Cast to satisfy Better Auth's overloaded type definition.
      const invitation = await auth.api.createInvitation({
        body: { email, role: role as 'member' | 'admin' | 'owner', organizationId: landlordId },
        headers: c.req.raw.headers,
      })
      return c.json({ invitation })
    },
  )
  .delete('/members/:userId', authMiddleware, requirePermission('admin'), async (c) => {
    const { landlordId } = await requireTenant(c)
    const targetUserId = c.req.param('userId')
    await auth.api.removeMember({
      body: { memberIdOrEmail: targetUserId, organizationId: landlordId },
      headers: c.req.raw.headers,
    })
    return c.json({ ok: true })
  })
  .put(
    '/members/:userId/role',
    authMiddleware,
    requirePermission('admin'),
    zValidator('json', updateRoleSchema),
    async (c) => {
      const { landlordId } = await requireTenant(c)
      const targetUserId = c.req.param('userId')
      const { role } = c.req.valid('json')
      await auth.api.updateMemberRole({
        body: { memberId: targetUserId, role, organizationId: landlordId },
        headers: c.req.raw.headers,
      })
      return c.json({ ok: true })
    },
  )
