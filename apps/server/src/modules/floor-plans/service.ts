import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import { floorPlans, floorPlanImages } from '../../schema/floor-plans.js'
import { units } from '../../schema/units.js'
import { badRequest, notFound } from '../../domain/index.js'
import { presignGet, deleteObject } from '../uploads/s3.js'
import { MAX_GALLERY_IMAGES } from '../uploads/schemas.js'
import type { OrganizationTx } from '../../db/index.js'
import type { CreateFloorPlanInput, UpdateFloorPlanInput } from './schemas.js'

export type FloorPlanRow = typeof floorPlans.$inferSelect
export type FloorPlanImageRow = typeof floorPlanImages.$inferSelect

export async function listFloorPlans(
  tx: OrganizationTx,
  organizationId: string,
  input: { propertyId: string; includeArchived: boolean },
): Promise<(FloorPlanRow & { unitCount: number; coverImageUrl: string | null })[]> {
  const rows = await tx
    .select()
    .from(floorPlans)
    .where(
      and(
        eq(floorPlans.organizationId, organizationId),
        eq(floorPlans.propertyId, input.propertyId),
        // Hide archived plans unless explicitly requested (D-26a).
        input.includeArchived ? undefined : isNull(floorPlans.archivedAt),
      ),
    )
    // Alphabetical, not createdAt (D-10).
    .orderBy(asc(floorPlans.name))

  if (rows.length === 0) return []

  // Active units assigned to each plan — one grouped query rather than N+1 (D-26).
  const countRows = await tx
    .select({ floorPlanId: units.floorPlanId, count: sql<number>`count(*)::int` })
    .from(units)
    .where(and(eq(units.organizationId, organizationId), isNull(units.archivedAt)))
    .groupBy(units.floorPlanId)
  const countByFloorPlan = new Map(countRows.map((row) => [row.floorPlanId, row.count]))

  // Cover photo = lowest sort_order image per plan (D-15) — one grouped query, then
  // presigned GET URLs generated at read time only (never stored, per S3 rule / D-16).
  const coverRows = await tx
    .selectDistinctOn([floorPlanImages.floorPlanId], {
      floorPlanId: floorPlanImages.floorPlanId,
      objectKey: floorPlanImages.objectKey,
    })
    .from(floorPlanImages)
    .where(eq(floorPlanImages.organizationId, organizationId))
    .orderBy(asc(floorPlanImages.floorPlanId), asc(floorPlanImages.sortOrder))
  const coverUrlByFloorPlan = new Map(
    await Promise.all(
      coverRows.map(
        async (row) => [row.floorPlanId, await presignGet({ objectKey: row.objectKey })] as const,
      ),
    ),
  )

  return rows.map((row) => ({
    ...row,
    unitCount: countByFloorPlan.get(row.id) ?? 0,
    coverImageUrl: coverUrlByFloorPlan.get(row.id) ?? null,
  }))
}

async function requireFloorPlan(
  tx: OrganizationTx,
  organizationId: string,
  floorPlanId: string,
): Promise<FloorPlanRow> {
  const rows = await tx
    .select()
    .from(floorPlans)
    .where(and(eq(floorPlans.id, floorPlanId), eq(floorPlans.organizationId, organizationId)))
    .limit(1)
  const floorPlan = rows[0]
  if (!floorPlan) notFound('Floor plan not found')
  return floorPlan
}

export async function getFloorPlan(
  tx: OrganizationTx,
  organizationId: string,
  floorPlanId: string,
): Promise<FloorPlanRow> {
  return requireFloorPlan(tx, organizationId, floorPlanId)
}

export async function createFloorPlan(
  tx: OrganizationTx,
  organizationId: string,
  input: CreateFloorPlanInput,
): Promise<FloorPlanRow> {
  const [row] = await tx
    .insert(floorPlans)
    .values({
      organizationId,
      propertyId: input.propertyId,
      name: input.name,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      defaultSquareFootage: input.defaultSquareFootage ?? null,
    })
    .returning()
  return row
}

export async function updateFloorPlan(
  tx: OrganizationTx,
  organizationId: string,
  input: UpdateFloorPlanInput,
): Promise<FloorPlanRow> {
  const { floorPlanId, ...rest } = input
  await requireFloorPlan(tx, organizationId, floorPlanId)

  const patch: Partial<typeof floorPlans.$inferInsert> = { updatedAt: new Date() }
  if (rest.propertyId !== undefined) patch.propertyId = rest.propertyId
  if (rest.name !== undefined) patch.name = rest.name
  if (rest.bedrooms !== undefined) patch.bedrooms = rest.bedrooms
  if (rest.bathrooms !== undefined) patch.bathrooms = rest.bathrooms
  if (rest.defaultSquareFootage !== undefined) patch.defaultSquareFootage = rest.defaultSquareFootage ?? null

  const [row] = await tx
    .update(floorPlans)
    .set(patch)
    .where(and(eq(floorPlans.id, floorPlanId), eq(floorPlans.organizationId, organizationId)))
    .returning()
  return row
}

export async function archiveFloorPlan(
  tx: OrganizationTx,
  organizationId: string,
  floorPlanId: string,
): Promise<FloorPlanRow> {
  const existing = await requireFloorPlan(tx, organizationId, floorPlanId)
  if (existing.archivedAt) return existing

  // Soft archive only — does NOT cascade to units (D-11). The units.floor_plan_id FK
  // stays intact; archiving a plan leaves assigned units and their inheritance untouched.
  const now = new Date()
  const [row] = await tx
    .update(floorPlans)
    .set({ archivedAt: now, updatedAt: now })
    .where(and(eq(floorPlans.id, floorPlanId), eq(floorPlans.organizationId, organizationId)))
    .returning()
  return row
}

// --- Gallery (D-12 / D-14 / D-15 / D-16) ---

export async function listGalleryImages(
  tx: OrganizationTx,
  organizationId: string,
  floorPlanId: string,
): Promise<(FloorPlanImageRow & { url: string })[]> {
  await requireFloorPlan(tx, organizationId, floorPlanId)
  const rows = await tx
    .select()
    .from(floorPlanImages)
    .where(
      and(eq(floorPlanImages.floorPlanId, floorPlanId), eq(floorPlanImages.organizationId, organizationId)),
    )
    .orderBy(asc(floorPlanImages.sortOrder))

  // Reads attach short-lived presigned GET URLs at response time only — never store URLs (D-16).
  return Promise.all(
    rows.map(async (row) => ({ ...row, url: await presignGet({ objectKey: row.objectKey }) })),
  )
}

export async function addGalleryImage(
  tx: OrganizationTx,
  organizationId: string,
  input: { floorPlanId: string; objectKey: string; contentType: string; byteLength: number },
): Promise<FloorPlanImageRow> {
  await requireFloorPlan(tx, organizationId, input.floorPlanId)

  const countRows = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(floorPlanImages)
    .where(
      and(
        eq(floorPlanImages.floorPlanId, input.floorPlanId),
        eq(floorPlanImages.organizationId, organizationId),
      ),
    )
  const current = countRows[0]?.count ?? 0
  // Double-enforced cap (presign + add) — reject the 26th image (D-14).
  if (current >= MAX_GALLERY_IMAGES) {
    badRequest(`Gallery limit reached (max ${MAX_GALLERY_IMAGES} images)`)
  }

  const [row] = await tx
    .insert(floorPlanImages)
    .values({
      organizationId,
      floorPlanId: input.floorPlanId,
      objectKey: input.objectKey,
      contentType: input.contentType,
      byteLength: input.byteLength,
      // First upload = sort_order 0 = cover (D-15); later reorders explicitly renumber.
      sortOrder: current,
    })
    .returning()
  return row
}

export async function reorderGalleryImages(
  tx: OrganizationTx,
  organizationId: string,
  floorPlanId: string,
  imageIds: string[],
): Promise<{ ok: true }> {
  await requireFloorPlan(tx, organizationId, floorPlanId)

  for (let i = 0; i < imageIds.length; i++) {
    await tx
      .update(floorPlanImages)
      .set({ sortOrder: i })
      .where(
        and(
          eq(floorPlanImages.id, imageIds[i]),
          eq(floorPlanImages.floorPlanId, floorPlanId),
          eq(floorPlanImages.organizationId, organizationId),
        ),
      )
  }
  return { ok: true }
}

export async function removeGalleryImage(
  tx: OrganizationTx,
  organizationId: string,
  floorPlanId: string,
  imageId: string,
): Promise<{ ok: true }> {
  const rows = await tx
    .select()
    .from(floorPlanImages)
    .where(
      and(
        eq(floorPlanImages.id, imageId),
        eq(floorPlanImages.floorPlanId, floorPlanId),
        eq(floorPlanImages.organizationId, organizationId),
      ),
    )
    .limit(1)
  const image = rows[0]
  if (!image) notFound('Image not found')

  // D-12: immediate S3 object delete + DB row removal — no soft-delete for gallery rows.
  await deleteObject({ objectKey: image.objectKey })
  await tx
    .delete(floorPlanImages)
    .where(and(eq(floorPlanImages.id, imageId), eq(floorPlanImages.organizationId, organizationId)))
  return { ok: true }
}
