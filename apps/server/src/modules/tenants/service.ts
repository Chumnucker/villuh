import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import { tenants, tenancies, tenancyMembers } from '../../schema/tenants.js'
import { units } from '../../schema/units.js'
import { idFilter, listWhere, searchCondition } from '../../lib/filter-sql.js'
import { resolveListQuery, runListQuery } from '../../lib/list-query.js'
import { badRequest, notFound } from '../../domain/index.js'
import type { OrganizationTx } from '../../db/index.js'
import type {
  CreateTenantInput,
  UpdateTenantInput,
  ListTenantsInput,
  CreateTenancyInput,
  UpdateTenancyInput,
  AddCoTenantInput,
  RemoveMemberInput,
  TenantActivityInput,
} from './schemas.js'

export type TenantRow = typeof tenants.$inferSelect
export type TenancyRow = typeof tenancies.$inferSelect
export type TenancyMemberRow = typeof tenancyMembers.$inferSelect

export type TenantListItem = TenantRow & {
  currentUnit: { id: string; label: string } | null
  tenancyStatus: TenancyRow['status'] | null
}

/**
 * `status` carries a Zod `.default('pending')`, so the *input* boundary may legitimately
 * omit it. Accept the pre-default shape here (the tRPC layer passes the fully-parsed value)
 * and fall back to 'pending' below — keeps guard-only callers from having to name a status.
 */
type CreateTenancyServiceInput = Omit<CreateTenancyInput, 'status'> & { status?: CreateTenancyInput['status'] }

async function requireTenant(tx: OrganizationTx, organizationId: string, tenantId: string): Promise<TenantRow> {
  const [row] = await tx
    .select()
    .from(tenants)
    .where(and(eq(tenants.id, tenantId), eq(tenants.organizationId, organizationId)))
    .limit(1)
  if (!row) notFound('Tenant not found')
  return row
}

async function requireUnit(tx: OrganizationTx, organizationId: string, unitId: string): Promise<void> {
  const [row] = await tx
    .select({ id: units.id })
    .from(units)
    .where(and(eq(units.id, unitId), eq(units.organizationId, organizationId)))
    .limit(1)
  if (!row) notFound('Unit not found')
}

async function requireTenancy(tx: OrganizationTx, organizationId: string, tenancyId: string): Promise<TenancyRow> {
  const [row] = await tx
    .select()
    .from(tenancies)
    .where(and(eq(tenancies.id, tenancyId), eq(tenancies.organizationId, organizationId)))
    .limit(1)
  if (!row) notFound('Tenancy not found')
  return row
}

/**
 * A tenant's "current" tenancy = the non-archived tenancy with the most relevant status.
 * active outranks pending; ended/archived are ignored. Encoded as a status rank so the
 * list read and the detail read agree. (TENT-01 status derivation.)
 */
const currentTenancyRank = sql`CASE ${tenancies.status} WHEN 'active' THEN 2 WHEN 'pending' THEN 1 ELSE 0 END`

export async function listTenants(
  tx: OrganizationTx,
  organizationId: string,
  input?: ListTenantsInput,
): Promise<{ tenants: TenantListItem[]; total: number }> {
  // Pre-select the current tenancy per tenant in an isolated subquery: DISTINCT ON keeps the
  // highest-ranked non-archived tenancy per tenant. This must own its ORDER BY, so it cannot
  // live in the outer list query — `runListQuery` overrides ORDER BY with the sort/tiebreaker,
  // which would break `DISTINCT ON`'s "must match initial ORDER BY" rule. So we resolve the
  // current tenancy here, then LEFT JOIN it into the paginated outer query.
  const currentTenancy = tx
    .selectDistinctOn([tenancyMembers.tenantId], {
      tenantId: tenancyMembers.tenantId,
      unitId: units.id,
      unitLabel: units.label,
      status: tenancies.status,
    })
    .from(tenancyMembers)
    .innerJoin(tenancies, and(eq(tenancies.id, tenancyMembers.tenancyId), isNull(tenancies.archivedAt)))
    .innerJoin(units, eq(units.id, tenancies.unitId))
    .where(eq(tenancyMembers.organizationId, organizationId))
    .orderBy(tenancyMembers.tenantId, sql`${currentTenancyRank} DESC`)
    .as('current_tenancy')

  const sortColumns = {
    name: tenants.lastName,
    email: tenants.email,
    currentUnit: currentTenancy.unitLabel,
    status: currentTenancy.status,
  } as Record<NonNullable<ListTenantsInput['sortBy']>, PgColumn>

  const where = listWhere(
    eq(tenants.organizationId, organizationId),
    isNull(tenants.archivedAt),
    idFilter(currentTenancy.unitId, { include: input?.unitIds, exclude: input?.excludeUnitIds, empty: input?.unitEmpty }),
    input?.statusIn?.length ? inArray(currentTenancy.status, input.statusIn) : undefined,
    searchCondition(input?.search, [tenants.firstName, tenants.lastName, tenants.email]),
  )

  const { items, total } = await runListQuery({
    tx,
    query: resolveListQuery(input, { columns: sortColumns, tiebreaker: tenants.createdAt }),
    base: () =>
      tx
        .select({
          tenant: tenants,
          unitId: currentTenancy.unitId,
          unitLabel: currentTenancy.unitLabel,
          tenancyStatus: currentTenancy.status,
        })
        .from(tenants)
        .leftJoin(currentTenancy, eq(currentTenancy.tenantId, tenants.id))
        .where(where)
        .$dynamic(),
  })

  return {
    total,
    tenants: items.map((row) => ({
      ...row.tenant,
      currentUnit: row.unitId && row.unitLabel ? { id: row.unitId, label: row.unitLabel } : null,
      tenancyStatus: row.tenancyStatus ?? null,
    })),
  }
}

export type TenantDetail = {
  tenant: TenantRow
  tenancies: Array<
    TenancyRow & {
      unit: { id: string; label: string }
      members: Array<{ tenantId: string; firstName: string; lastName: string; isPrimary: boolean }>
    }
  >
}

export async function getTenant(tx: OrganizationTx, organizationId: string, tenantId: string): Promise<TenantDetail> {
  const tenant = await requireTenant(tx, organizationId, tenantId)

  const tenancyIds = (
    await tx
      .select({ tenancyId: tenancyMembers.tenancyId })
      .from(tenancyMembers)
      .where(and(eq(tenancyMembers.tenantId, tenantId), eq(tenancyMembers.organizationId, organizationId)))
  ).map((r) => r.tenancyId)

  if (tenancyIds.length === 0) return { tenant, tenancies: [] }

  const tenancyRows = await tx
    .select({ tenancy: tenancies, unitId: units.id, unitLabel: units.label })
    .from(tenancies)
    .innerJoin(units, eq(units.id, tenancies.unitId))
    .where(and(inArray(tenancies.id, tenancyIds), eq(tenancies.organizationId, organizationId)))

  const memberRows = await tx
    .select({
      tenancyId: tenancyMembers.tenancyId,
      tenantId: tenancyMembers.tenantId,
      isPrimary: tenancyMembers.isPrimary,
      firstName: tenants.firstName,
      lastName: tenants.lastName,
    })
    .from(tenancyMembers)
    .innerJoin(tenants, eq(tenants.id, tenancyMembers.tenantId))
    .where(and(inArray(tenancyMembers.tenancyId, tenancyIds), eq(tenancyMembers.organizationId, organizationId)))

  return {
    tenant,
    tenancies: tenancyRows.map((r) => ({
      ...r.tenancy,
      unit: { id: r.unitId, label: r.unitLabel },
      members: memberRows
        .filter((m) => m.tenancyId === r.tenancy.id)
        .map((m) => ({ tenantId: m.tenantId, firstName: m.firstName, lastName: m.lastName, isPrimary: m.isPrimary })),
    })),
  }
}

export async function createTenant(tx: OrganizationTx, organizationId: string, input: CreateTenantInput): Promise<TenantRow> {
  const [row] = await tx
    .insert(tenants)
    .values({
      organizationId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
    })
    .returning()
  return row
}

export async function updateTenant(tx: OrganizationTx, organizationId: string, input: UpdateTenantInput): Promise<TenantRow> {
  const { tenantId, ...rest } = input
  await requireTenant(tx, organizationId, tenantId)
  const patch: Partial<typeof tenants.$inferInsert> = { updatedAt: new Date() }
  if (rest.firstName !== undefined) patch.firstName = rest.firstName
  if (rest.lastName !== undefined) patch.lastName = rest.lastName
  if (rest.email !== undefined) patch.email = rest.email
  if (rest.phone !== undefined) patch.phone = rest.phone ?? null
  if (rest.notes !== undefined) patch.notes = rest.notes ?? null
  const [row] = await tx
    .update(tenants)
    .set(patch)
    .where(and(eq(tenants.id, tenantId), eq(tenants.organizationId, organizationId)))
    .returning()
  return row
}

export async function archiveTenant(tx: OrganizationTx, organizationId: string, tenantId: string): Promise<TenantRow> {
  const existing = await requireTenant(tx, organizationId, tenantId)
  if (existing.archivedAt) return existing
  const now = new Date()
  const [row] = await tx
    .update(tenants)
    .set({ archivedAt: now, updatedAt: now })
    .where(and(eq(tenants.id, tenantId), eq(tenants.organizationId, organizationId)))
    .returning()
  return row
}

export async function createTenancy(tx: OrganizationTx, organizationId: string, input: CreateTenancyServiceInput): Promise<TenancyRow> {
  await requireUnit(tx, organizationId, input.unitId)
  if (!input.memberTenantIds.includes(input.primaryTenantId)) badRequest('The primary tenant must be one of the members.')
  for (const id of input.memberTenantIds) await requireTenant(tx, organizationId, id)

  const status = input.status ?? 'pending'
  // App-level guard mirrors the DB partial index for a friendly error before hitting it.
  if (status === 'active') {
    const [clash] = await tx
      .select({ id: tenancies.id })
      .from(tenancies)
      .where(and(eq(tenancies.unitId, input.unitId), eq(tenancies.status, 'active'), isNull(tenancies.archivedAt)))
      .limit(1)
    if (clash) badRequest('This unit already has an active tenancy.')
  }

  const [tenancy] = await tx
    .insert(tenancies)
    .values({
      organizationId,
      unitId: input.unitId,
      status,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
    })
    .returning()

  await tx.insert(tenancyMembers).values(
    input.memberTenantIds.map((tenantId) => ({
      organizationId,
      tenancyId: tenancy.id,
      tenantId,
      isPrimary: tenantId === input.primaryTenantId,
    })),
  )
  return tenancy
}

export async function addCoTenant(tx: OrganizationTx, organizationId: string, input: AddCoTenantInput): Promise<TenancyMemberRow> {
  await requireTenancy(tx, organizationId, input.tenancyId)
  await requireTenant(tx, organizationId, input.tenantId)
  const [row] = await tx
    .insert(tenancyMembers)
    .values({ organizationId, tenancyId: input.tenancyId, tenantId: input.tenantId, isPrimary: false })
    .onConflictDoNothing({ target: [tenancyMembers.tenancyId, tenancyMembers.tenantId] })
    .returning()
  if (!row) badRequest('That tenant is already on this tenancy.')
  return row
}

export async function removeMember(tx: OrganizationTx, organizationId: string, input: RemoveMemberInput): Promise<void> {
  await requireTenancy(tx, organizationId, input.tenancyId)
  const [member] = await tx
    .select()
    .from(tenancyMembers)
    .where(
      and(
        eq(tenancyMembers.tenancyId, input.tenancyId),
        eq(tenancyMembers.tenantId, input.tenantId),
        eq(tenancyMembers.organizationId, organizationId),
      ),
    )
    .limit(1)
  if (!member) notFound('Member not found')
  if (member.isPrimary) badRequest('Promote another member to primary before removing this one.')
  await tx
    .delete(tenancyMembers)
    .where(and(eq(tenancyMembers.tenancyId, input.tenancyId), eq(tenancyMembers.tenantId, input.tenantId)))
}

export async function updateTenancy(tx: OrganizationTx, organizationId: string, input: UpdateTenancyInput): Promise<TenancyRow> {
  const existing = await requireTenancy(tx, organizationId, input.tenancyId)
  const patch: Partial<typeof tenancies.$inferInsert> = { updatedAt: new Date() }
  if (input.status !== undefined) patch.status = input.status
  if (input.startDate !== undefined) patch.startDate = input.startDate ?? null
  if (input.endDate !== undefined) patch.endDate = input.endDate ?? null

  if (input.status === 'active' && existing.status !== 'active') {
    const [clash] = await tx
      .select({ id: tenancies.id })
      .from(tenancies)
      .where(and(eq(tenancies.unitId, existing.unitId), eq(tenancies.status, 'active'), isNull(tenancies.archivedAt)))
      .limit(1)
    if (clash) badRequest('This unit already has an active tenancy.')
  }
  const [row] = await tx
    .update(tenancies)
    .set(patch)
    .where(and(eq(tenancies.id, input.tenancyId), eq(tenancies.organizationId, organizationId)))
    .returning()
  return row
}

export type TenantActivityEntry = {
  id: string; tableName: string; rowId: string; operation: string; actorId: string; createdAt: string
}

/**
 * Read-only timeline over the partitioned audit_log (RLS-scoped by org). We gather the
 * tenant's own row id plus its tenancy ids and membership ids, then select audit rows whose
 * (table_name, row_id) match. Future phases (doc views, logins) appear automatically once
 * their tables emit audit rows. No new write path (TENT-03).
 */
export async function getTenantActivity(
  tx: OrganizationTx, organizationId: string, input: TenantActivityInput,
): Promise<{ entries: TenantActivityEntry[]; total: number }> {
  await requireTenant(tx, organizationId, input.tenantId)

  const memberRows = await tx.select({ id: tenancyMembers.id, tenancyId: tenancyMembers.tenancyId })
    .from(tenancyMembers)
    .where(and(eq(tenancyMembers.tenantId, input.tenantId), eq(tenancyMembers.organizationId, organizationId)))

  const tenancyIds = memberRows.map((r) => r.tenancyId)
  const membershipIds = memberRows.map((r) => r.id)
  const rowIds = [input.tenantId, ...tenancyIds, ...membershipIds]

  const offset = (input.page - 1) * input.limit
  const idList = sql.join(rowIds.map((id) => sql`${id}::uuid`), sql`, `)

  const entries = await tx.execute(sql`
    SELECT id, table_name AS "tableName", row_id AS "rowId", operation, actor_id AS "actorId", created_at AS "createdAt"
    FROM audit_log
    WHERE table_name IN ('tenants','tenancies','tenancy_members')
      AND row_id IN (${idList})
    ORDER BY created_at DESC
    LIMIT ${input.limit} OFFSET ${offset}
  `) as unknown as TenantActivityEntry[]

  const totalRes = await tx.execute(sql`
    SELECT COUNT(*)::int AS c FROM audit_log
    WHERE table_name IN ('tenants','tenancies','tenancy_members') AND row_id IN (${idList})
  `) as unknown as { c: number }[]

  return { entries, total: totalRes[0]?.c ?? 0 }
}

export async function endTenancy(tx: OrganizationTx, organizationId: string, tenancyId: string): Promise<TenancyRow> {
  const existing = await requireTenancy(tx, organizationId, tenancyId)
  if (existing.status === 'ended') return existing
  const now = new Date()
  const [row] = await tx
    .update(tenancies)
    .set({ status: 'ended', archivedAt: now, updatedAt: now })
    .where(and(eq(tenancies.id, tenancyId), eq(tenancies.organizationId, organizationId)))
    .returning()
  return row
}
