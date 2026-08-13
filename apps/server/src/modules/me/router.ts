import { sql, eq } from 'drizzle-orm'
import { router, protectedProcedure } from '../../trpc.js'
import { organization } from '../../schema/auth.js'
import { planLimits } from '../../schema/plan-limits.js'
import { loadRolePermissions } from '../permissions/service.js'
import { withOrganization } from '../../db/index.js'
import { DEFAULT_PERMISSIONS } from '../permissions/service.js'
import { isRole, notFound, type Role } from '../../domain/index.js'
import { resolveLimitsTier } from '../billing/plans.js'
import { countActiveProperties, countActiveUnits } from '../../domain/portfolio-counts.js'

export const meRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const { organizationId, userId, user } = ctx
    return withOrganization(organizationId, userId, async (tx) => {
      const orgRows = await tx.select().from(organization).where(eq(organization.id, organizationId)).limit(1)
      if (orgRows.length === 0) notFound('Organization not found')

      const org = orgRows[0]!
      const tier = (org.subscription_tier as string) ?? 'trial'
      const status = (org.subscription_status as string) ?? 'trial_pending'
      const lookupTier = await resolveLimitsTier(tier)
      const limitRows = await tx.select().from(planLimits).where(eq(planLimits.tier, lookupTier))
      const limits: Record<string, number> = {}
      for (const r of limitRows) limits[r.resource] = r.limit

      const memberCountRows = (await tx.execute(
        sql`SELECT COUNT(*)::int AS c FROM "member" WHERE organization_id = ${organizationId}`,
      )) as unknown as { c: number }[]

      // D-41: units/properties reflect active (non-archived) counts — never client-supplied (T-03-20).
      const counts = {
        units: await countActiveUnits(tx, organizationId),
        properties: await countActiveProperties(tx, organizationId),
        members: memberCountRows[0]?.c ?? 0,
      }

      const memberRows = (await tx.execute(
        sql`SELECT role FROM "member" WHERE organization_id = ${organizationId} AND user_id = ${userId} LIMIT 1`,
      )) as unknown as { role: string }[]
      // Better Auth may have stored one of its built-in roles here; fall back to
      // the least-privileged one instead of passing it to the `org_role` enum.
      const storedRole = memberRows[0]?.role
      const role: Role = isRole(storedRole) ? storedRole : 'viewer'
      // Pass tx — avoid nested withOrganization
      const permissions =
        role === 'owner' ? DEFAULT_PERMISSIONS.owner : await loadRolePermissions(organizationId, role, tx)

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: (user as { image?: string }).image ?? null,
        },
        org: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          subscription_tier: tier,
          subscription_status: status,
          setup_completed: org.setup_completed ?? false,
          permissions,
          quota: {
            units: { count: counts.units, limit: limits['units'] ?? 5 },
            properties: { count: counts.properties, limit: limits['properties'] ?? 1 },
            members: { count: counts.members, limit: limits['members'] ?? 2 },
          },
        },
      }
    })
  }),
})
