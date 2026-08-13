import { and, eq, isNull } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import { units, unitStatuses } from '../../schema/units.js'
import { properties } from '../../schema/properties.js'
import { tenancies } from '../../schema/tenants.js'
import { floorPlans } from '../../schema/floor-plans.js'
import { idFilter, listWhere, numericFilter, searchCondition } from '../../lib/filter-sql.js'
import { resolveListQuery, runListQuery } from '../../lib/list-query.js'
import { ensureDefaultUnitStatuses } from '../../domain/unit-statuses.js'
import { assertPlanLimit } from '../../domain/plan-limit.js'
import { countActiveUnits } from '../../domain/portfolio-counts.js'
import { badRequest, notFound } from '../../domain/index.js'
import type { OrganizationTx } from '../../db/index.js'
import type { CreateUnitInput, ListUnitsInput, UpdateUnitInput } from './schemas.js'

export type UnitRow = typeof units.$inferSelect

export type UnitListItem = UnitRow & {
  propertyName: string
  status: {
    id: string
    name: string
    iconKey: string
    colorKey: string
  } | null
}

async function requireProperty(tx: OrganizationTx, organizationId: string, propertyId: string): Promise<void> {
  const rows = await tx
    .select({ id: properties.id })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.organizationId, organizationId)))
    .limit(1)
  if (!rows[0]) notFound('Property not found')
}

/**
 * A floor plan may only be assigned to a unit of its own property (D-27). A plan that is
 * missing in-org, or that belongs to a different property, is a cross-property assignment
 * attempt — rejected with BAD_REQUEST (not NOT_FOUND): the plan id may be perfectly valid,
 * it just does not belong to this unit's property (T-03.2-08).
 */
async function requireFloorPlanInProperty(
  tx: OrganizationTx,
  organizationId: string,
  floorPlanId: string,
  propertyId: string,
): Promise<void> {
  const rows = await tx
    .select({ propertyId: floorPlans.propertyId })
    .from(floorPlans)
    .where(and(eq(floorPlans.id, floorPlanId), eq(floorPlans.organizationId, organizationId)))
    .limit(1)
  const plan = rows[0]
  if (!plan || plan.propertyId !== propertyId) {
    badRequest('That floor plan belongs to a different property.')
  }
}

async function requireUnitStatus(tx: OrganizationTx, organizationId: string, statusId: string): Promise<void> {
  const rows = await tx
    .select({ id: unitStatuses.id })
    .from(unitStatuses)
    .where(and(eq(unitStatuses.id, statusId), eq(unitStatuses.organizationId, organizationId)))
    .limit(1)
  if (!rows[0]) notFound('Unit status not found')
}

async function requireUnit(tx: OrganizationTx, organizationId: string, unitId: string): Promise<UnitRow> {
  const rows = await tx
    .select()
    .from(units)
    .where(and(eq(units.id, unitId), eq(units.organizationId, organizationId)))
    .limit(1)
  const unit = rows[0]
  if (!unit) notFound('Unit not found')
  return unit
}

/** `sortBy` keys → SQL columns. The satisfies check enforces coverage of `UNIT_SORT_KEYS`. */
const UNIT_SORT_COLUMNS = {
  label: units.label,
  propertyName: properties.name,
  status: unitStatuses.name,
  baseRent: units.baseRent,
} satisfies Record<NonNullable<ListUnitsInput['sortBy']>, PgColumn>

export async function listUnits(
  tx: OrganizationTx,
  organizationId: string,
  input?: ListUnitsInput,
): Promise<{ units: UnitListItem[]; total: number }> {
  const where = listWhere(
    eq(units.organizationId, organizationId),
    isNull(units.archivedAt),
    idFilter(units.propertyId, {
      include: input?.propertyIds,
      exclude: input?.excludePropertyIds,
    }),
    idFilter(units.statusId, {
      include: input?.statusIds,
      exclude: input?.excludeStatusIds,
      empty: input?.statusEmpty,
    }),
    numericFilter(units.baseRent, input?.baseRentCents, { trunc: true }),
    numericFilter(units.squareFootage, input?.squareFootage, {
      trunc: true,
      empty: input?.squareFootageEmpty,
    }),
    searchCondition(input?.search, [units.label, properties.name]),
  )

  const { items, total } = await runListQuery({
    tx,
    query: resolveListQuery(input, {
      columns: UNIT_SORT_COLUMNS,
      tiebreaker: units.createdAt,
    }),
    base: () =>
      tx
        .select({
          unit: units,
          propertyName: properties.name,
          statusId: unitStatuses.id,
          statusName: unitStatuses.name,
          statusIconKey: unitStatuses.iconKey,
          statusColorKey: unitStatuses.colorKey,
        })
        .from(units)
        .innerJoin(properties, eq(units.propertyId, properties.id))
        .leftJoin(unitStatuses, eq(units.statusId, unitStatuses.id))
        .where(where)
        .$dynamic(),
  })

  return {
    total,
    units: items.map((row) => ({
      ...row.unit,
      propertyName: row.propertyName,
      status:
        row.statusId && row.statusName && row.statusIconKey && row.statusColorKey
          ? {
              id: row.statusId,
              name: row.statusName,
              iconKey: row.statusIconKey,
              colorKey: row.statusColorKey,
            }
          : null,
    })),
  }
}

export type UnitDetail = {
  unit: UnitRow
  property: { id: string; name: string }
  status: UnitListItem['status']
}

/**
 * Single-unit fetch with its property and status resolved in one query —
 * detail screens must not have to download the whole properties/statuses
 * lists just to label one unit.
 */
export async function getUnit(tx: OrganizationTx, organizationId: string, unitId: string): Promise<UnitDetail> {
  const rows = await tx
    .select({
      unit: units,
      propertyId: properties.id,
      propertyName: properties.name,
      statusId: unitStatuses.id,
      statusName: unitStatuses.name,
      statusIconKey: unitStatuses.iconKey,
      statusColorKey: unitStatuses.colorKey,
    })
    .from(units)
    .innerJoin(properties, eq(units.propertyId, properties.id))
    .leftJoin(unitStatuses, eq(units.statusId, unitStatuses.id))
    .where(and(eq(units.id, unitId), eq(units.organizationId, organizationId)))
    .limit(1)
  const row = rows[0]
  if (!row) notFound('Unit not found')

  return {
    unit: row.unit,
    property: { id: row.propertyId, name: row.propertyName },
    status:
      row.statusId && row.statusName && row.statusIconKey && row.statusColorKey
        ? {
            id: row.statusId,
            name: row.statusName,
            iconKey: row.statusIconKey,
            colorKey: row.statusColorKey,
          }
        : null,
  }
}

export async function createUnit(
  tx: OrganizationTx,
  organizationId: string,
  input: CreateUnitInput,
): Promise<UnitRow> {
  // Seed defaults before validating statusId — a brand-new org may not have the catalog yet.
  await ensureDefaultUnitStatuses(organizationId, tx)
  await requireProperty(tx, organizationId, input.propertyId)
  if (input.statusId) await requireUnitStatus(tx, organizationId, input.statusId)
  if (input.floorPlanId) await requireFloorPlanInProperty(tx, organizationId, input.floorPlanId, input.propertyId)

  const current = await countActiveUnits(tx, organizationId)
  await assertPlanLimit({ tx, organizationId, resource: 'units', current })

  // New fields are written only when supplied — never copied from the plan (D-19); a unit
  // inherits from its plan by leaving the column null, resolved client-side (D-20).
  const [row] = await tx
    .insert(units)
    .values({
      organizationId,
      propertyId: input.propertyId,
      label: input.label,
      squareFootage: input.squareFootage ?? null,
      baseRent: input.baseRentCents,
      statusId: input.statusId ?? null,
      floorPlanId: input.floorPlanId ?? null,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
    })
    .returning()
  return row
}

export async function updateUnit(
  tx: OrganizationTx,
  organizationId: string,
  input: UpdateUnitInput,
): Promise<UnitRow> {
  const { unitId, ...rest } = input
  const existing = await requireUnit(tx, organizationId, unitId)
  if (rest.statusId !== undefined) await requireUnitStatus(tx, organizationId, rest.statusId)
  // D-27a: property is immutable, so the plan is always validated against the unit's own property.
  if (rest.floorPlanId) await requireFloorPlanInProperty(tx, organizationId, rest.floorPlanId, existing.propertyId)

  const patch: Partial<typeof units.$inferInsert> = { updatedAt: new Date() }
  // D-27a: a unit's property is immutable after creation — propertyId is not accepted here.
  if (rest.label !== undefined) patch.label = rest.label
  if (rest.squareFootage !== undefined) patch.squareFootage = rest.squareFootage ?? null
  if (rest.baseRentCents !== undefined) patch.baseRent = rest.baseRentCents
  // D-28: status assignment is manual write-permission territory, not admin-only catalog mgmt.
  if (rest.statusId !== undefined) patch.statusId = rest.statusId ?? null
  // Present → write (null clears back to inheriting, D-45); absent → leave alone (D-19).
  if (rest.floorPlanId !== undefined) patch.floorPlanId = rest.floorPlanId ?? null
  if (rest.bedrooms !== undefined) patch.bedrooms = rest.bedrooms ?? null
  if (rest.bathrooms !== undefined) patch.bathrooms = rest.bathrooms ?? null

  const [row] = await tx
    .update(units)
    .set(patch)
    .where(and(eq(units.id, unitId), eq(units.organizationId, organizationId)))
    .returning()
  return row
}

export async function archiveUnit(tx: OrganizationTx, organizationId: string, unitId: string): Promise<UnitRow> {
  const existing = await requireUnit(tx, organizationId, unitId)
  if (existing.archivedAt) return existing

  // Locked spec guard #6: a unit cannot be archived while it still has an active tenancy —
  // the occupancy must be ended (retained) first, mirroring the DB single-active invariant.
  const [activeTenancy] = await tx
    .select({ id: tenancies.id })
    .from(tenancies)
    .where(and(eq(tenancies.unitId, unitId), eq(tenancies.status, 'active'), isNull(tenancies.archivedAt)))
    .limit(1)
  if (activeTenancy) badRequest('End the active tenancy on this unit first.')

  const now = new Date()
  const [row] = await tx
    .update(units)
    .set({ archivedAt: now, updatedAt: now })
    .where(and(eq(units.id, unitId), eq(units.organizationId, organizationId)))
    .returning()
  return row
}
