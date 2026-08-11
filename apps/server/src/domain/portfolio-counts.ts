import { and, eq, isNull, sql } from 'drizzle-orm'
import { properties } from '../schema/properties.js'
import { units } from '../schema/units.js'
import type { OrganizationTx } from '../db/index.js'

/** Active (non-archived) counts — used by plan-limit checks, Stripe unit sync, and quota display (Pitfall 2). */

export async function countActiveProperties(tx: OrganizationTx, organizationId: string): Promise<number> {
  const rows = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(properties)
    .where(and(eq(properties.organizationId, organizationId), isNull(properties.archivedAt)))
  return rows[0]?.count ?? 0
}

export async function countActiveUnits(tx: OrganizationTx, organizationId: string): Promise<number> {
  const rows = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(units)
    .where(and(eq(units.organizationId, organizationId), isNull(units.archivedAt)))
  return rows[0]?.count ?? 0
}
