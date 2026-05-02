import { Hono } from 'hono'
import { sql, eq } from 'drizzle-orm'
import { authMiddleware, type AuthVariables } from '../middleware/auth.js'
import { requireTenant } from '../middleware/require-tenant.js'
import { organization } from '@villuh/db/schema/auth'
import { planLimits } from '@villuh/db/schema/plan-limits'
import { loadRolePermissions, type Role } from '../lib/permissions.js'
import { withTenant } from '../lib/tenant.js'

export const me = new Hono<{ Variables: AuthVariables }>().get(
  '/',
  authMiddleware,
  async (c) => {
    const { landlordId, userId } = await requireTenant(c)
    const user = c.get('user')!

    return withTenant(landlordId, userId, async (tx) => {
      const orgRows = await tx
        .select()
        .from(organization)
        .where(eq(organization.id, landlordId))
        .limit(1)
      if (orgRows.length === 0) return c.json({ error: 'Organization not found' }, 404)

      const org = orgRows[0]
      const tier = (org.subscription_tier as string) ?? 'trial'
      const status = (org.subscription_status as string) ?? 'trial_pending'

      // Limits — tier 'trial' gets 'pro' limits per D-19
      const lookupTier = tier === 'trial' ? 'pro' : tier
      const limitRows = await tx.select().from(planLimits).where(eq(planLimits.tier, lookupTier))
      const limits: Record<string, number> = {}
      for (const r of limitRows) limits[r.resource] = r.limit

      // Member count
      const memberCountRows = (await tx.execute(
        sql`SELECT COUNT(*)::int AS c FROM "member" WHERE organization_id = ${landlordId}`,
      )) as unknown as { c: number }[]

      // TODO(Phase 3): replace 0s with real COUNT(*) from properties + units tables
      const counts = { units: 0, properties: 0, members: memberCountRows[0]?.c ?? 0 }

      // Permissions
      const memberRows = (await tx.execute(
        sql`SELECT role FROM "member" WHERE organization_id = ${landlordId} AND user_id = ${userId} LIMIT 1`,
      )) as unknown as { role: Role }[]
      const role: Role = memberRows[0]?.role ?? 'viewer'
      const permissions =
        role === 'owner'
          ? { write: true, financial: true, communications: true, admin: true }
          : await loadRolePermissions(landlordId, role)

      return c.json({
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
            units:      { count: counts.units,      limit: limits['units']      ?? 5 },
            properties: { count: counts.properties, limit: limits['properties'] ?? 1 },
            members:    { count: counts.members,    limit: limits['members']    ?? 2 },
          },
        },
      })
    })
  },
)
