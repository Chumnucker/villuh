import { z } from 'zod'

/** Fixed option set — validated here rather than a Postgres enum (see schema/properties.ts). */
export const PROPERTY_TYPES = [
  'single_family',
  'duplex',
  'triplex',
  'fourplex',
  'apartment_complex',
  'condo',
  'townhouse',
  'manufactured',
  'commercial',
  'other',
] as const
export type PropertyType = (typeof PROPERTY_TYPES)[number]

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  single_family: 'Single-family',
  duplex: 'Duplex',
  triplex: 'Triplex',
  fourplex: 'Fourplex',
  apartment_complex: 'Apartment complex',
  condo: 'Condo',
  townhouse: 'Townhouse',
  manufactured: 'Manufactured / mobile home',
  commercial: 'Commercial',
  other: 'Other',
}

export const PARKING_TYPES = ['none', 'street', 'driveway', 'garage', 'carport', 'assigned_lot'] as const
export type ParkingType = (typeof PARKING_TYPES)[number]

export const PARKING_TYPE_LABELS: Record<ParkingType, string> = {
  none: 'No parking',
  street: 'Street parking',
  driveway: 'Driveway',
  garage: 'Garage',
  carport: 'Carport',
  assigned_lot: 'Assigned lot',
}

const currentYear = new Date().getFullYear()

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
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  yearBuilt: z.number().int().min(1800).max(currentYear + 1).optional(),
  parkingType: z.enum(PARKING_TYPES).optional(),
  parkingSpaces: z.number().int().min(0).max(999).optional(),
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
