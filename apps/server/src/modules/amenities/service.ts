import { and, asc, eq, isNotNull, isNull, sql } from 'drizzle-orm'
import { organizationAmenity, propertyAmenity, unitAmenity } from '../../schema/amenities.js'
import { properties } from '../../schema/properties.js'
import { badRequest, notFound } from '../../domain/index.js'
import { ensureDefaultAmenities } from '../../domain/amenities.js'
import type { OrganizationTx } from '../../db/index.js'
import type {
  CreateAmenityInput,
  UpdateAmenityInput,
  AddPropertyAmenityInput,
  AddFreeformPropertyAmenityInput,
  UpdatePropertyAmenityInput,
  SetPropertyAmenitiesInput,
} from './schemas.js'

export type OrganizationAmenityRow = typeof organizationAmenity.$inferSelect
export type PropertyAmenityRow = typeof propertyAmenity.$inferSelect
export type UnitAmenityRow = typeof unitAmenity.$inferSelect

// The (organization_id, name) unique constraint (D-17) surfaces from Postgres as a 23505 error.
// A duplicate name is user input, not a server fault — translate it to BAD_REQUEST rather than
// letting it bubble up as INTERNAL_SERVER_ERROR (floor-plans precedent).
function rethrowDuplicateNameAsBadRequest(err: unknown): never {
  // Drizzle wraps the driver error, so the Postgres 23505 code + constraint name may sit on the
  // thrown error itself or on its `cause`. Check both.
  const candidates = [err, (err as { cause?: unknown } | null)?.cause]
  for (const candidate of candidates) {
    if (
      typeof candidate === 'object' &&
      candidate !== null &&
      (candidate as { code?: string }).code === '23505' &&
      String(
        (candidate as { constraint_name?: string; constraint?: string }).constraint_name ??
          (candidate as { constraint?: string }).constraint ??
          '',
      ).includes('organization_amenity_org_name_unique')
    ) {
      badRequest('An amenity with that name already exists in this catalog.')
    }
  }
  throw err
}

async function requireOrganizationAmenity(
  tx: OrganizationTx,
  organizationId: string,
  organizationAmenityId: string,
): Promise<OrganizationAmenityRow> {
  const rows = await tx
    .select()
    .from(organizationAmenity)
    .where(and(eq(organizationAmenity.id, organizationAmenityId), eq(organizationAmenity.organizationId, organizationId)))
    .limit(1)
  const amenity = rows[0]
  if (!amenity) notFound('Amenity not found')
  return amenity
}

// D-43/D-44: seed the 22 starter rows on first read (idempotent, archived-aware guard), then list
// active (non-archived) catalog rows ordered deterministically.
export async function listCatalog(
  tx: OrganizationTx,
  organizationId: string,
): Promise<OrganizationAmenityRow[]> {
  await ensureDefaultAmenities(organizationId, tx)
  return tx
    .select()
    .from(organizationAmenity)
    .where(and(eq(organizationAmenity.organizationId, organizationId), isNull(organizationAmenity.archivedAt)))
    .orderBy(asc(organizationAmenity.sortOrder), asc(organizationAmenity.name))
}

export async function createAmenity(
  tx: OrganizationTx,
  organizationId: string,
  input: CreateAmenityInput,
): Promise<OrganizationAmenityRow> {
  const [row] = await tx
    .insert(organizationAmenity)
    .values({
      organizationId,
      name: input.name,
      description: input.description,
      scope: input.scope,
      // iconKey/colorKey fall back to the column defaults (IconStar / slate, D-12) when omitted.
      iconKey: input.iconKey,
      colorKey: input.colorKey,
    })
    .returning()
    .catch(rethrowDuplicateNameAsBadRequest)
  return row
}

// THE DELTA from tags (D-11): rename propagation. Read the previousName BEFORE patching the
// catalog row, then in the SAME transaction push label/icon/color onto every catalog-backed
// assignment whose label still equals previousName. Freeform rows are excluded by the FK equality;
// deliberately customized labels are excluded by the `label = previousName` guard.
export async function updateAmenity(
  tx: OrganizationTx,
  organizationId: string,
  input: UpdateAmenityInput,
): Promise<OrganizationAmenityRow> {
  const { organizationAmenityId, ...rest } = input
  const existing = await requireOrganizationAmenity(tx, organizationId, organizationAmenityId)
  const previousName = existing.name

  const patch: Partial<typeof organizationAmenity.$inferInsert> = { updatedAt: new Date() }
  if (rest.name !== undefined) patch.name = rest.name
  if (rest.description !== undefined) patch.description = rest.description
  if (rest.scope !== undefined) patch.scope = rest.scope
  if (rest.iconKey !== undefined) patch.iconKey = rest.iconKey
  if (rest.colorKey !== undefined) patch.colorKey = rest.colorKey

  const [row] = await tx
    .update(organizationAmenity)
    .set(patch)
    .where(and(eq(organizationAmenity.id, organizationAmenityId), eq(organizationAmenity.organizationId, organizationId)))
    .returning()
    .catch(rethrowDuplicateNameAsBadRequest)

  // Only propagate the fields the caller actually changed (per D-11) — scope/description are not
  // denormalized onto assignments, so they never trigger propagation.
  const assignmentPatch: Partial<{ label: string; iconKey: OrganizationAmenityRow['iconKey']; colorKey: OrganizationAmenityRow['colorKey'] }> = {}
  if (rest.name !== undefined) assignmentPatch.label = row.name
  if (rest.iconKey !== undefined) assignmentPatch.iconKey = row.iconKey
  if (rest.colorKey !== undefined) assignmentPatch.colorKey = row.colorKey

  if (Object.keys(assignmentPatch).length > 0) {
    await tx
      .update(propertyAmenity)
      .set(assignmentPatch)
      .where(
        and(
          eq(propertyAmenity.organizationId, organizationId),
          eq(propertyAmenity.organizationAmenityId, organizationAmenityId),
          eq(propertyAmenity.label, previousName),
        ),
      )
    await tx
      .update(unitAmenity)
      .set(assignmentPatch)
      .where(
        and(
          eq(unitAmenity.organizationId, organizationId),
          eq(unitAmenity.organizationAmenityId, organizationAmenityId),
          eq(unitAmenity.label, previousName),
        ),
      )
  }

  return row
}

// D-10/D-18: catalog archives (never deletes) and is_system rows are freely archivable — NO guard.
// Archiving hides an entry from pickers while every existing assignment keeps rendering unchanged.
export async function archiveAmenity(
  tx: OrganizationTx,
  organizationId: string,
  organizationAmenityId: string,
): Promise<OrganizationAmenityRow> {
  const existing = await requireOrganizationAmenity(tx, organizationId, organizationAmenityId)
  if (existing.archivedAt) return existing

  const now = new Date()
  const [row] = await tx
    .update(organizationAmenity)
    .set({ archivedAt: now, updatedAt: now })
    .where(and(eq(organizationAmenity.id, organizationAmenityId), eq(organizationAmenity.organizationId, organizationId)))
    .returning()
  return row
}

export async function restoreAmenity(
  tx: OrganizationTx,
  organizationId: string,
  organizationAmenityId: string,
): Promise<OrganizationAmenityRow> {
  await requireOrganizationAmenity(tx, organizationId, organizationAmenityId)
  const [row] = await tx
    .update(organizationAmenity)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(and(eq(organizationAmenity.id, organizationAmenityId), eq(organizationAmenity.organizationId, organizationId)))
    .returning()
  return row
}

// D-37: promote a freeform property assignment into the catalog. Dedupe by (organizationId, name) —
// link an existing catalog row rather than creating a second "Rooftop deck". The new/linked row's
// icon/color are denormalized back onto the assignment.
export async function promoteFromProperty(
  tx: OrganizationTx,
  organizationId: string,
  propertyAmenityId: string,
): Promise<{ amenity: OrganizationAmenityRow; propertyAmenity: PropertyAmenityRow }> {
  const rows = await tx
    .select()
    .from(propertyAmenity)
    .where(and(eq(propertyAmenity.id, propertyAmenityId), eq(propertyAmenity.organizationId, organizationId)))
    .limit(1)
  const freeform = rows[0]
  if (!freeform) notFound('Property amenity not found')
  if (freeform.organizationAmenityId) badRequest('Amenity is already linked to the catalog')

  const existingRows = await tx
    .select()
    .from(organizationAmenity)
    .where(and(eq(organizationAmenity.organizationId, organizationId), eq(organizationAmenity.name, freeform.label)))
    .limit(1)

  const amenity =
    existingRows[0] ??
    (
      await tx
        .insert(organizationAmenity)
        .values({
          organizationId,
          name: freeform.label,
          scope: 'property',
          iconKey: freeform.iconKey,
          colorKey: freeform.colorKey,
        })
        .returning()
        .catch(rethrowDuplicateNameAsBadRequest)
    )[0]!

  const [updated] = await tx
    .update(propertyAmenity)
    .set({ organizationAmenityId: amenity.id, iconKey: amenity.iconKey, colorKey: amenity.colorKey })
    .where(and(eq(propertyAmenity.id, propertyAmenityId), eq(propertyAmenity.organizationId, organizationId)))
    .returning()

  return { amenity, propertyAmenity: updated }
}

export async function promoteFromUnit(
  tx: OrganizationTx,
  organizationId: string,
  unitAmenityId: string,
): Promise<{ amenity: OrganizationAmenityRow; unitAmenity: UnitAmenityRow }> {
  const rows = await tx
    .select()
    .from(unitAmenity)
    .where(and(eq(unitAmenity.id, unitAmenityId), eq(unitAmenity.organizationId, organizationId)))
    .limit(1)
  const freeform = rows[0]
  if (!freeform) notFound('Unit amenity not found')
  if (freeform.organizationAmenityId) badRequest('Amenity is already linked to the catalog')

  const existingRows = await tx
    .select()
    .from(organizationAmenity)
    .where(and(eq(organizationAmenity.organizationId, organizationId), eq(organizationAmenity.name, freeform.label)))
    .limit(1)

  const amenity =
    existingRows[0] ??
    (
      await tx
        .insert(organizationAmenity)
        .values({
          organizationId,
          name: freeform.label,
          scope: 'unit',
          iconKey: freeform.iconKey,
          colorKey: freeform.colorKey,
        })
        .returning()
        .catch(rethrowDuplicateNameAsBadRequest)
    )[0]!

  const [updated] = await tx
    .update(unitAmenity)
    .set({ organizationAmenityId: amenity.id, iconKey: amenity.iconKey, colorKey: amenity.colorKey })
    .where(and(eq(unitAmenity.id, unitAmenityId), eq(unitAmenity.organizationId, organizationId)))
    .returning()

  return { amenity, unitAmenity: updated }
}

// ---------------------------------------------------------------------------
// Property assignments (property_amenity) — D-23/D-32/D-34/D-35/D-36
// ---------------------------------------------------------------------------

// The partial unique index (D-22) `property_amenity_catalog_unique` (property_id,
// organization_amenity_id WHERE organization_amenity_id IS NOT NULL) surfaces from Postgres as a
// 23505. Attaching the same catalog amenity twice is user input, not a server fault — translate to
// BAD_REQUEST (floor-plans / catalog precedent).
function rethrowDuplicateAssignmentAsBadRequest(err: unknown): never {
  const candidates = [err, (err as { cause?: unknown } | null)?.cause]
  for (const candidate of candidates) {
    if (
      typeof candidate === 'object' &&
      candidate !== null &&
      (candidate as { code?: string }).code === '23505' &&
      String(
        (candidate as { constraint_name?: string; constraint?: string }).constraint_name ??
          (candidate as { constraint?: string }).constraint ??
          '',
      ).includes('property_amenity_catalog_unique')
    ) {
      badRequest('This amenity is already assigned to the property.')
    }
  }
  throw err
}

async function requireProperty(tx: OrganizationTx, organizationId: string, propertyId: string): Promise<void> {
  const rows = await tx
    .select({ id: properties.id })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.organizationId, organizationId)))
    .limit(1)
  if (!rows[0]) notFound('Property not found')
}

// In-org 404 AND (when a parent property is named) cross-entity guard: a property_amenity id that
// belongs to a DIFFERENT property is rejected as not-found (D-36, IDOR mitigation T-033-10).
async function requirePropertyAmenity(
  tx: OrganizationTx,
  organizationId: string,
  propertyAmenityId: string,
  expectedPropertyId?: string,
): Promise<PropertyAmenityRow> {
  const rows = await tx
    .select()
    .from(propertyAmenity)
    .where(and(eq(propertyAmenity.id, propertyAmenityId), eq(propertyAmenity.organizationId, organizationId)))
    .limit(1)
  const row = rows[0]
  if (!row) notFound('Property amenity not found')
  if (expectedPropertyId !== undefined && row.propertyId !== expectedPropertyId) {
    notFound('Property amenity not found')
  }
  return row
}

// Scope enforcement (D-34, Pitfall 7): a catalog amenity may attach to a target only when its scope
// is exactly that target OR `both`. A unit-scoped amenity on a property → BAD_REQUEST.
function assertScopeAllows(scope: OrganizationAmenityRow['scope'], target: 'property' | 'unit'): void {
  if (scope !== 'both' && scope !== target) {
    badRequest(`This amenity is scoped to "${scope}" and cannot be attached to a ${target}.`)
  }
}

async function nextPropertyAmenitySortOrder(
  tx: OrganizationTx,
  organizationId: string,
  propertyId: string,
): Promise<number> {
  const rows = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(propertyAmenity)
    .where(and(eq(propertyAmenity.propertyId, propertyId), eq(propertyAmenity.organizationId, organizationId)))
  return rows[0]?.count ?? 0
}

export async function listPropertyAmenities(
  tx: OrganizationTx,
  organizationId: string,
  propertyId: string,
): Promise<PropertyAmenityRow[]> {
  await requireProperty(tx, organizationId, propertyId)
  return tx
    .select()
    .from(propertyAmenity)
    .where(and(eq(propertyAmenity.propertyId, propertyId), eq(propertyAmenity.organizationId, organizationId)))
    .orderBy(asc(propertyAmenity.sortOrder), asc(propertyAmenity.createdAt))
}

// Attach a catalog amenity: validate scope, then denormalize label/description/icon/color from the
// catalog row (D-23) so display never depends on a join.
export async function addPropertyAmenity(
  tx: OrganizationTx,
  organizationId: string,
  input: AddPropertyAmenityInput,
): Promise<PropertyAmenityRow> {
  await requireProperty(tx, organizationId, input.propertyId)
  const catalog = await requireOrganizationAmenity(tx, organizationId, input.organizationAmenityId)
  assertScopeAllows(catalog.scope, 'property')

  const sortOrder = await nextPropertyAmenitySortOrder(tx, organizationId, input.propertyId)
  const [row] = await tx
    .insert(propertyAmenity)
    .values({
      organizationId,
      propertyId: input.propertyId,
      organizationAmenityId: catalog.id,
      label: catalog.name,
      description: catalog.description,
      iconKey: catalog.iconKey,
      colorKey: catalog.colorKey,
      sortOrder,
    })
    .returning()
    .catch(rethrowDuplicateAssignmentAsBadRequest)
  return row
}

export async function addFreeformPropertyAmenity(
  tx: OrganizationTx,
  organizationId: string,
  input: AddFreeformPropertyAmenityInput,
): Promise<PropertyAmenityRow> {
  await requireProperty(tx, organizationId, input.propertyId)

  const sortOrder = await nextPropertyAmenitySortOrder(tx, organizationId, input.propertyId)
  const [row] = await tx
    .insert(propertyAmenity)
    .values({
      organizationId,
      propertyId: input.propertyId,
      // Freeform assignment — no catalog link (D-32); icon/color fall back to column defaults.
      organizationAmenityId: null,
      label: input.label,
      description: input.description,
      iconKey: input.iconKey,
      colorKey: input.colorKey,
      sortOrder,
    })
    .returning()
  return row
}

// Patch ONLY this assignment (D-32) — never touches the catalog. Reservability config lives here.
export async function updatePropertyAmenity(
  tx: OrganizationTx,
  organizationId: string,
  input: UpdatePropertyAmenityInput,
): Promise<PropertyAmenityRow> {
  const { propertyAmenityId, ...rest } = input
  await requirePropertyAmenity(tx, organizationId, propertyAmenityId)

  const patch: Partial<typeof propertyAmenity.$inferInsert> = { updatedAt: new Date() }
  if (rest.label !== undefined) patch.label = rest.label
  if (rest.description !== undefined) patch.description = rest.description
  if (rest.iconKey !== undefined) patch.iconKey = rest.iconKey
  if (rest.colorKey !== undefined) patch.colorKey = rest.colorKey
  if (rest.isReservable !== undefined) patch.isReservable = rest.isReservable
  if (rest.requiresApproval !== undefined) patch.requiresApproval = rest.requiresApproval

  const [row] = await tx
    .update(propertyAmenity)
    .set(patch)
    .where(and(eq(propertyAmenity.id, propertyAmenityId), eq(propertyAmenity.organizationId, organizationId)))
    .returning()
  return row
}

export async function removePropertyAmenity(
  tx: OrganizationTx,
  organizationId: string,
  propertyAmenityId: string,
): Promise<{ ok: true }> {
  await requirePropertyAmenity(tx, organizationId, propertyAmenityId)
  await tx
    .delete(propertyAmenity)
    .where(and(eq(propertyAmenity.id, propertyAmenityId), eq(propertyAmenity.organizationId, organizationId)))
  return { ok: true }
}

export async function reorderPropertyAmenities(
  tx: OrganizationTx,
  organizationId: string,
  propertyId: string,
  orderedIds: string[],
): Promise<{ ok: true }> {
  await requireProperty(tx, organizationId, propertyId)
  for (let i = 0; i < orderedIds.length; i++) {
    await tx
      .update(propertyAmenity)
      .set({ sortOrder: i, updatedAt: new Date() })
      .where(
        and(
          eq(propertyAmenity.id, orderedIds[i]),
          eq(propertyAmenity.propertyId, propertyId),
          eq(propertyAmenity.organizationId, organizationId),
        ),
      )
  }
  return { ok: true }
}

// Bulk-replace catalog-backed assignments (multi-select) — delete only the rows WITH a catalog link
// (isNotNull), then re-insert from ids. Freeform rows (organizationAmenityId IS NULL) survive (D-32).
export async function setPropertyAmenities(
  tx: OrganizationTx,
  organizationId: string,
  input: SetPropertyAmenitiesInput,
): Promise<PropertyAmenityRow[]> {
  await requireProperty(tx, organizationId, input.propertyId)

  await tx
    .delete(propertyAmenity)
    .where(
      and(
        eq(propertyAmenity.propertyId, input.propertyId),
        eq(propertyAmenity.organizationId, organizationId),
        isNotNull(propertyAmenity.organizationAmenityId),
      ),
    )

  const rows: PropertyAmenityRow[] = []
  for (let i = 0; i < input.organizationAmenityIds.length; i++) {
    const catalog = await requireOrganizationAmenity(tx, organizationId, input.organizationAmenityIds[i])
    assertScopeAllows(catalog.scope, 'property')
    const [row] = await tx
      .insert(propertyAmenity)
      .values({
        organizationId,
        propertyId: input.propertyId,
        organizationAmenityId: catalog.id,
        label: catalog.name,
        description: catalog.description,
        iconKey: catalog.iconKey,
        colorKey: catalog.colorKey,
        sortOrder: i,
      })
      .returning()
      .catch(rethrowDuplicateAssignmentAsBadRequest)
    if (row) rows.push(row)
  }
  return rows
}
