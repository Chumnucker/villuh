import { z } from 'zod'
import { sql, eq } from 'drizzle-orm'
import { router, protectedProcedure, permissionProcedure } from '../../trpc.js'
import { auth } from '../auth/index.js'
import { planLimits } from '../../schema/plan-limits.js'
import { organization } from '../../schema/auth.js'
import { withOrganization } from '../../db/index.js'
import { zRole, forbidden } from '../../domain/index.js'
import { resolveLimitsTier } from '../billing/plans.js'

export const membersRouter = router({
  getMembers: protectedProcedure.query(async ({ ctx }) => {
    const { organizationId, userId } = ctx
    return withOrganization(organizationId, userId, async (tx) => {
      const rows = await tx.execute(sql`
        SELECT m.id AS member_id, m.role, u.id AS user_id, u.name, u.email, u.image, m.created_at AS joined_at
        FROM "member" m
        JOIN "user" u ON u.id = m.user_id
        WHERE m.organization_id = ${organizationId}
        ORDER BY m.created_at ASC
      `)
      return { members: rows as unknown[] }
    })
  }),

  getInvitations: protectedProcedure.query(async ({ ctx }) => {
    const { organizationId, userId } = ctx
    return withOrganization(organizationId, userId, async (tx) => {
      const rows = await tx.execute(sql`
        SELECT id, email, role, status, expires_at, inviter_id
        FROM "invitation"
        WHERE organization_id = ${organizationId} AND status = 'pending'
        ORDER BY expires_at DESC
      `)
      return { invitations: rows as unknown[] }
    })
  }),

  createInvitation: permissionProcedure('admin')
    .input(z.object({
      email: z.string().email(),
      role: zRole,
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const { email, role } = input

      await withOrganization(organizationId, userId, async (tx) => {
        const memberCountRows = (await tx.execute(sql`
          SELECT (
            (SELECT COUNT(*) FROM "member" WHERE organization_id = ${organizationId})
            + (SELECT COUNT(*) FROM "invitation" WHERE organization_id = ${organizationId} AND status = 'pending')
          )::int AS c
        `)) as unknown as { c: number }[]
        const totalMembers = memberCountRows[0]?.c ?? 0

        const orgRows = await tx
          .select()
          .from(organization)
          .where(eq(organization.id, organizationId))
          .limit(1)
        const tier = (orgRows[0]?.subscription_tier as string) ?? 'trial'
        const lookupTier = await resolveLimitsTier(tier)
        const limitRows = await tx
          .select()
          .from(planLimits)
          .where(sql`tier = ${lookupTier} AND resource = 'members'`)
          .limit(1)
        const limit = limitRows[0]?.limit ?? 2

        if (limit !== -1 && totalMembers >= limit) {
          forbidden('Member plan limit reached', 'PLAN_LIMIT', {
            resource: 'members',
            limit,
            current: totalMembers,
            upgrade_to: tier === 'starter' ? 'growth' : 'pro',
          })
        }
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invitation = await (auth.api.createInvitation as any)({
        body: { email, role, organizationId: organizationId },
        headers: ctx.headers,
      })
      return { invitation }
    }),

  removeMember: permissionProcedure('admin')
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx
      await auth.api.removeMember({
        body: { memberIdOrEmail: input.userId, organizationId: organizationId },
        headers: ctx.headers,
      })
      return { ok: true }
    }),

  updateMemberRole: permissionProcedure('admin')
    .input(z.object({
      userId: z.string(),
      role: zRole,
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx
      const { userId, role } = input
      await auth.api.updateMemberRole({
        body: { memberId: userId, role, organizationId: organizationId },
        headers: ctx.headers,
      })
      return { ok: true }
    }),
})
