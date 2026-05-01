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
      // Load org row (denormalized subscription_tier, subscription_status, setup_completed per D-23)
      const orgRows = await tx
        .select()
        .from(organization)
        .where(eq(organization.id, landlordId))
        .limit(1)
      if (orgRows.length === 0) {
        return c.json({ error: 'Organization not found' }, 404)
      }
      const org = orgRows[0]
      const tier = (org.subscription_tier as string) ?? 'trial'
      const status = (org.subscription_status as string) ?? 'trialing'

      // Member count
      const memberCountRows = (await tx.execute(
        sql`SELECT COUNT(*)::int AS c FROM "member" WHERE organization_id = ${landlordId}`,
      )) as unknown as { c: number }[]
      const member_count = memberCountRows[0]?.c ?? 0

      // Phase 2 unit + property counts — onboarding_state table ships in Plan 02-06.
      // TODO(Plan 02-06): replace with real query against onboarding_state once the table exists.
      // NOTE: Querying a non-existent table inside a Postgres transaction aborts the entire
      // transaction ("current transaction is aborted"), so we skip the query for now.
      // TODO(Phase 3): replace with real COUNT(*) from properties + units tables.
      let property_count = 0
      let unit_count = 0

      // Lookup limits from plan_limits — tier 'trial' uses 'pro' limits per D-19 (full Pro access)
      const lookupTier = tier === 'trial' ? 'pro' : tier
      const limitRows = await tx
        .select()
        .from(planLimits)
        .where(eq(planLimits.tier, lookupTier))
      const limitsMap: Record<string, number> = {}
      for (const r of limitRows) {
        limitsMap[r.resource] = r.limit
      }

      // Resolve user's role (member.role)
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
        },
        tier,
        unit_count,
        unit_limit: limitsMap['units'] ?? 5,
        property_count,
        property_limit: limitsMap['properties'] ?? 1,
        member_count,
        member_limit: limitsMap['members'] ?? 2,
        subscription_status: status,
        permissions: permissions,
      })
    })
  },
)
