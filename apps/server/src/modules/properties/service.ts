import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import { properties, propertyImages } from '../../schema/properties.js'
import { units } from '../../schema/units.js'
import { assertPlanLimit } from '../../domain/plan-limit.js'
import { countActiveProperties } from '../../domain/portfolio-counts.js'
import { sanitizeNotesHtml } from '../../lib/sanitize-notes.js'
import { badRequest, notFound } from '../../domain/index.js'
import { presignGet, deleteObject } from '../uploads/s3.js'
import { MAX_GALLERY_IMAGES } from '../uploads/schemas.js'
import type { OrganizationTx } from '../../db/index.js'
import type { CreatePropertyInput, UpdatePropertyInput } from './schemas.js'

export type PropertyRow = typeof properties.$inferSelect
export type PropertyImageRow = typeof propertyImages.$inferSelect

function toLatLng(value: number | undefined): string | null | undefined {
  if (value === undefined) return undefined
  return value === null ? null : String(value)
}

export async function listProperties(
  tx: OrganizationTx,
  organizationId: string,
): Promise<(PropertyRow & { unitCount: number; coverImageUrl: string | null })[]> {
  const rows = await tx
    .select()
    .from(properties)
    .where(and(eq(properties.organizationId, organizationId), isNull(properties.archivedAt)))
    .orderBy(asc(properties.createdAt))

  if (rows.length === 0) return []

  // Landlord card list footer snippet (UI-SPEC Screen 1: `{unitCount} units`) — count active
  // units per property in one grouped query rather than N+1 per card.
  const countRows = await tx
    .select({ propertyId: units.propertyId, count: sql<number>`count(*)::int` })
    .from(units)
    .where(and(eq(units.organizationId, organizationId), isNull(units.archivedAt)))
    .groupBy(units.propertyId)
  const countByProperty = new Map(countRows.map((row) => [row.propertyId, row.count]))

  // Cover photo = lowest sort_order image per property (D-35) — one grouped query, then
  // presigned GET URLs generated at read time only (never stored, per S3 rule).
  const coverRows = await tx
    .selectDistinctOn([propertyImages.propertyId], {
      propertyId: propertyImages.propertyId,
      objectKey: propertyImages.objectKey,
    })
    .from(propertyImages)
    .where(eq(propertyImages.organizationId, organizationId))
    .orderBy(asc(propertyImages.propertyId), asc(propertyImages.sortOrder))
  const coverUrlByProperty = new Map(
    await Promise.all(
      coverRows.map(
        async (row) => [row.propertyId, await presignGet({ objectKey: row.objectKey })] as const,
      ),
    ),
  )

  return rows.map((row) => ({
    ...row,
    unitCount: countByProperty.get(row.id) ?? 0,
    coverImageUrl: coverUrlByProperty.get(row.id) ?? null,
  }))
}

async function requireProperty(
  tx: OrganizationTx,
  organizationId: string,
  propertyId: string,
): Promise<PropertyRow> {
  const rows = await tx
    .select()
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.organizationId, organizationId)))
    .limit(1)
  const property = rows[0]
  if (!property) notFound('Property not found')
  return property
}

export async function getPropertyWithUnits(
  tx: OrganizationTx,
  organizationId: string,
  propertyId: string,
): Promise<{
  property: PropertyRow & { coverImageUrl: string | null }
  units: (typeof units.$inferSelect)[]
}> {
  const property = await requireProperty(tx, organizationId, propertyId)
  // D-33: property archive confirm UX lists every affected unit — surfaced here on get.
  const unitRows = await tx
    .select()
    .from(units)
    .where(
      and(
        eq(units.propertyId, propertyId),
        eq(units.organizationId, organizationId),
        isNull(units.archivedAt),
      ),
    )

  // Cover photo = lowest sort_order image (D-35), same as `listProperties` — fetched
  // alongside the property row instead of a separate `gallery.list` round-trip the
  // detail page used to make just to grab the first image (which also presigned
  // every gallery image, not just the one actually needed for the hero backdrop).
  const [coverRow] = await tx
    .select({ objectKey: propertyImages.objectKey })
    .from(propertyImages)
    .where(
      and(eq(propertyImages.propertyId, propertyId), eq(propertyImages.organizationId, organizationId)),
    )
    .orderBy(asc(propertyImages.sortOrder))
    .limit(1)
  const coverImageUrl = coverRow ? await presignGet({ objectKey: coverRow.objectKey }) : null

  return { property: { ...property, coverImageUrl }, units: unitRows }
}

export async function createProperty(
  tx: OrganizationTx,
  organizationId: string,
  input: CreatePropertyInput,
): Promise<PropertyRow> {
  const current = await countActiveProperties(tx, organizationId)
  await assertPlanLimit({ tx, organizationId, resource: 'properties', current })

  const [row] = await tx
    .insert(properties)
    .values({
      organizationId,
      name: input.name,
      phone: input.phone || null,
      notes: input.notes ? sanitizeNotesHtml(input.notes) : null,
      street: input.street || null,
      line2: input.line2 || null,
      city: input.city || null,
      region: input.region || null,
      postal: input.postal || null,
      country: input.country || null,
      latitude: toLatLng(input.latitude) ?? null,
      longitude: toLatLng(input.longitude) ?? null,
      propertyType: input.propertyType ?? null,
      yearBuilt: input.yearBuilt ?? null,
      parkingType: input.parkingType ?? null,
      parkingSpaces: input.parkingSpaces ?? null,
    })
    .returning()
  return row
}

export async function updateProperty(
  tx: OrganizationTx,
  organizationId: string,
  input: UpdatePropertyInput,
): Promise<PropertyRow> {
  const { propertyId, ...rest } = input
  await requireProperty(tx, organizationId, propertyId)

  const patch: Partial<typeof properties.$inferInsert> = { updatedAt: new Date() }
  if (rest.name !== undefined) patch.name = rest.name
  if (rest.phone !== undefined) patch.phone = rest.phone || null
  if (rest.notes !== undefined) patch.notes = sanitizeNotesHtml(rest.notes ?? '')
  if (rest.street !== undefined) patch.street = rest.street || null
  if (rest.line2 !== undefined) patch.line2 = rest.line2 || null
  if (rest.city !== undefined) patch.city = rest.city || null
  if (rest.region !== undefined) patch.region = rest.region || null
  if (rest.postal !== undefined) patch.postal = rest.postal || null
  if (rest.country !== undefined) patch.country = rest.country || null
  if (rest.latitude !== undefined) patch.latitude = toLatLng(rest.latitude) ?? null
  if (rest.longitude !== undefined) patch.longitude = toLatLng(rest.longitude) ?? null
  if (rest.propertyType !== undefined) patch.propertyType = rest.propertyType || null
  if (rest.yearBuilt !== undefined) patch.yearBuilt = rest.yearBuilt ?? null
  if (rest.parkingType !== undefined) patch.parkingType = rest.parkingType || null
  if (rest.parkingSpaces !== undefined) patch.parkingSpaces = rest.parkingSpaces ?? null

  const [row] = await tx
    .update(properties)
    .set(patch)
    .where(and(eq(properties.id, propertyId), eq(properties.organizationId, organizationId)))
    .returning()
  return row
}

export async function archiveProperty(
  tx: OrganizationTx,
  organizationId: string,
  propertyId: string,
): Promise<{ property: PropertyRow; archivedUnitIds: string[] }> {
  const existing = await requireProperty(tx, organizationId, propertyId)
  if (existing.archivedAt) {
    return { property: existing, archivedUnitIds: [] }
  }

  const now = new Date()

  // D-31: cascade soft-archive to every active child unit in the same transaction (Pitfall 3).
  const affectedUnits = await tx
    .select({ id: units.id })
    .from(units)
    .where(
      and(
        eq(units.propertyId, propertyId),
        eq(units.organizationId, organizationId),
        isNull(units.archivedAt),
      ),
    )

  const [property] = await tx
    .update(properties)
    .set({ archivedAt: now, updatedAt: now })
    .where(and(eq(properties.id, propertyId), eq(properties.organizationId, organizationId)))
    .returning()

  if (affectedUnits.length > 0) {
    await tx
      .update(units)
      .set({ archivedAt: now, updatedAt: now })
      .where(
        and(
          eq(units.propertyId, propertyId),
          eq(units.organizationId, organizationId),
          isNull(units.archivedAt),
        ),
      )
  }

  return { property, archivedUnitIds: affectedUnits.map((u) => u.id) }
}

// --- Gallery (D-02 / D-34-D-38) ---

export async function listGalleryImages(
  tx: OrganizationTx,
  organizationId: string,
  propertyId: string,
): Promise<(PropertyImageRow & { url: string })[]> {
  await requireProperty(tx, organizationId, propertyId)
  const rows = await tx
    .select()
    .from(propertyImages)
    .where(and(eq(propertyImages.propertyId, propertyId), eq(propertyImages.organizationId, organizationId)))
    .orderBy(asc(propertyImages.sortOrder))

  // Reads attach short-lived presigned GET URLs at response time only — never store URLs (D-38).
  return Promise.all(
    rows.map(async (row) => ({ ...row, url: await presignGet({ objectKey: row.objectKey }) })),
  )
}

export async function addGalleryImage(
  tx: OrganizationTx,
  organizationId: string,
  input: { propertyId: string; objectKey: string; contentType: string; byteLength: number },
): Promise<PropertyImageRow> {
  await requireProperty(tx, organizationId, input.propertyId)

  const countRows = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(propertyImages)
    .where(
      and(eq(propertyImages.propertyId, input.propertyId), eq(propertyImages.organizationId, organizationId)),
    )
  const current = countRows[0]?.count ?? 0
  if (current >= MAX_GALLERY_IMAGES) {
    badRequest(`Gallery limit reached (max ${MAX_GALLERY_IMAGES} images)`)
  }

  const [row] = await tx
    .insert(propertyImages)
    .values({
      organizationId,
      propertyId: input.propertyId,
      objectKey: input.objectKey,
      contentType: input.contentType,
      byteLength: input.byteLength,
      // First upload = sort_order 0 = cover (D-35); later reorders explicitly renumber.
      sortOrder: current,
    })
    .returning()
  return row
}

export async function reorderGalleryImages(
  tx: OrganizationTx,
  organizationId: string,
  propertyId: string,
  imageIds: string[],
): Promise<{ ok: true }> {
  await requireProperty(tx, organizationId, propertyId)

  for (let i = 0; i < imageIds.length; i++) {
    await tx
      .update(propertyImages)
      .set({ sortOrder: i })
      .where(
        and(
          eq(propertyImages.id, imageIds[i]),
          eq(propertyImages.propertyId, propertyId),
          eq(propertyImages.organizationId, organizationId),
        ),
      )
  }
  return { ok: true }
}

export async function removeGalleryImage(
  tx: OrganizationTx,
  organizationId: string,
  propertyId: string,
  imageId: string,
): Promise<{ ok: true }> {
  const rows = await tx
    .select()
    .from(propertyImages)
    .where(
      and(
        eq(propertyImages.id, imageId),
        eq(propertyImages.propertyId, propertyId),
        eq(propertyImages.organizationId, organizationId),
      ),
    )
    .limit(1)
  const image = rows[0]
  if (!image) notFound('Image not found')

  // D-37: immediate S3 object delete + DB row removal — no soft-delete for gallery rows.
  await deleteObject({ objectKey: image.objectKey })
  await tx
    .delete(propertyImages)
    .where(and(eq(propertyImages.id, imageId), eq(propertyImages.organizationId, organizationId)))
  return { ok: true }
}
