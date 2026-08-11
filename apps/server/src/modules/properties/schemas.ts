import { z } from 'zod'

/** Shared by tRPC `properties.create` and the landlord create-property form. */
export const createPropertyInputSchema = z.object({
  name: z.string().trim().min(1, 'Property name is required').max(200, 'Name must be at most 200 characters'),
  // Optional (D-12).
  phone: z.string().trim().max(30).optional(),
  // Optional TipTap-authored HTML — sanitized server-side before persist (D-15/D-16).
  notes: z.string().max(20000).optional(),
  // Structured address (D-11); nullable at the DB layer since Mapbox may be unavailable (D-25).
  street: z.string().trim().max(200).optional(),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(120).optional(),
  region: z.string().trim().max(120).optional(),
  postal: z.string().trim().max(30).optional(),
  country: z.string().trim().max(120).optional(),
  // Populated only for Mapbox-sourced addresses (D-23); nullable for manual entry.
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
})

export type CreatePropertyInput = z.infer<typeof createPropertyInputSchema>

export const updatePropertyInputSchema = createPropertyInputSchema.partial().extend({
  propertyId: z.uuid(),
})

export type UpdatePropertyInput = z.infer<typeof updatePropertyInputSchema>

export const propertyIdInputSchema = z.object({
  propertyId: z.uuid(),
})

export const galleryListInputSchema = z.object({
  propertyId: z.uuid(),
})

export const galleryAddInputSchema = z.object({
  propertyId: z.uuid(),
  // Opaque S3 key only — never a full URL (D-38); returned by uploads.presignPropertyImage.
  objectKey: z.string().trim().min(1),
  contentType: z.string().trim().min(1),
  byteLength: z.number().int().positive(),
})

export const galleryReorderInputSchema = z.object({
  propertyId: z.uuid(),
  // Full ordered list of image IDs for this property — index 0 becomes the cover (D-35).
  imageIds: z.array(z.uuid()).min(1),
})

export const galleryRemoveInputSchema = z.object({
  propertyId: z.uuid(),
  imageId: z.uuid(),
})
