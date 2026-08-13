import { z } from 'zod'

/** Shared by tRPC `floorPlans.create` and the landlord create-floor-plan wizard. */
export const createFloorPlanInputSchema = z.object({
  propertyId: z.uuid(),
  name: z.string().trim().min(1, 'Floor plan name is required').max(200, 'Name must be at most 200 characters'),
  // 0 = Studio sentinel; app-enforced 0-20 range (D-08).
  bedrooms: z.number().int().min(0).max(20),
  // Quarter-bath increments (D-07); JS number at the ORM boundary.
  bathrooms: z.number().multipleOf(0.25).min(0).max(20),
  defaultSquareFootage: z.number().int().positive().optional(),
})

export type CreateFloorPlanInput = z.infer<typeof createFloorPlanInputSchema>

export const updateFloorPlanInputSchema = createFloorPlanInputSchema.partial().extend({
  floorPlanId: z.uuid(),
})

export type UpdateFloorPlanInput = z.infer<typeof updateFloorPlanInputSchema>

export const floorPlanIdInputSchema = z.object({
  floorPlanId: z.uuid(),
})

export const listFloorPlansInputSchema = z.object({
  propertyId: z.uuid(),
  // Default hides archived plans; the unit form requests archived too (D-26a).
  includeArchived: z.boolean().default(false),
})

export const galleryListInputSchema = z.object({
  floorPlanId: z.uuid(),
})

export const galleryAddInputSchema = z.object({
  floorPlanId: z.uuid(),
  // Opaque S3 key only — never a full URL (D-16); returned by uploads.presignFloorPlanImage.
  objectKey: z.string().trim().min(1),
  contentType: z.string().trim().min(1),
  byteLength: z.number().int().positive(),
})

export const galleryReorderInputSchema = z.object({
  floorPlanId: z.uuid(),
  // Full ordered list of image IDs for this floor plan — index 0 becomes the cover (D-15).
  imageIds: z.array(z.uuid()).min(1),
})

export const galleryRemoveInputSchema = z.object({
  floorPlanId: z.uuid(),
  imageId: z.uuid(),
})
