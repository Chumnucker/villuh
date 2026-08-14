import { z } from 'zod'
// Self-reference via the package export alias (mirrors units/schemas.ts →
// @villuh/server/schemas/filters). A relative `../tags/schemas.js` import
// fails to resolve when this file is pulled into the landlord client bundle by
// the amenity overlays (Turbopack cannot map the explicit `.js` on a
// cross-module relative path); the alias resolves in both Node ESM and the
// client build.
import { TAG_COLOR_KEYS, zTagColorKey } from '@villuh/server/schemas/tags'

/**
 * Amenity scope — a catalog amenity applies to properties, units, or both (D-02).
 * Backs the `amenity_scope` Postgres enum (see schema/enums.ts), so adding a value
 * needs a migration alongside the edit here (D-04).
 */
export const AMENITY_SCOPES = ['property', 'unit', 'both'] as const

export const zAmenityScope = z.enum(AMENITY_SCOPES)
export type AmenityScope = z.infer<typeof zAmenityScope>

/**
 * Fixed amenity icon palette (spec §5.1) — 38 keys, each mapped to a verified
 * `@solar-icons/react/linear` glyph in `PlatformIcon`. `IconStar` is the default.
 * The Zod enum rejects out-of-palette icon names at the API boundary (D-12), and the
 * same array backs the `amenity_icon` Postgres enum (schema/enums.ts) — adding a key
 * means editing this array *and* writing a migration (D-04).
 */
export const AMENITY_ICON_KEYS = [
  'IconStar',
  'IconPool',
  'IconGym',
  'IconLaundry',
  'IconWifi',
  'IconPets',
  'IconParking',
  'IconEvCharging',
  'IconAirConditioning',
  'IconHeating',
  'IconFridge',
  'IconKitchen',
  'IconBath',
  'IconBed',
  'IconFurnished',
  'IconTv',
  'IconTheater',
  'IconSecurity',
  'IconCamera',
  'IconOutlet',
  'IconLighting',
  'IconLounge',
  'IconGameRoom',
  'IconBasketball',
  'IconTennis',
  'IconGolf',
  'IconVolleyball',
  'IconWater',
  'IconPackageLocker',
  'IconMail',
  'IconCoworking',
  'IconCoffee',
  'IconOutdoor',
  'IconPatio',
  'IconRooftop',
  'IconAccessible',
  'IconTrack',
  'IconLibrary',
] as const

export const zAmenityIconKey = z.enum(AMENITY_ICON_KEYS)
export type AmenityIconKey = z.infer<typeof zAmenityIconKey>

// colorKey reuses the locked tag palette (D-04) — never a new color array.
export { TAG_COLOR_KEYS, zTagColorKey }

// ---------------------------------------------------------------------------
// Catalog (organization_amenity) inputs
// ---------------------------------------------------------------------------

export const createAmenityInputSchema = z.object({
  name: z.string().trim().min(1, 'Amenity name is required').max(100, 'Name must be at most 100 characters'),
  description: z.string().trim().max(2000).optional(),
  scope: zAmenityScope,
  iconKey: zAmenityIconKey.optional(),
  colorKey: zTagColorKey.optional(),
})
export type CreateAmenityInput = z.infer<typeof createAmenityInputSchema>

export const updateAmenityInputSchema = z.object({
  organizationAmenityId: z.uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(2000).optional(),
  scope: zAmenityScope.optional(),
  iconKey: zAmenityIconKey.optional(),
  colorKey: zTagColorKey.optional(),
})
export type UpdateAmenityInput = z.infer<typeof updateAmenityInputSchema>

export const amenityIdInputSchema = z.object({
  organizationAmenityId: z.uuid(),
})
export type AmenityIdInput = z.infer<typeof amenityIdInputSchema>

export const promoteFromPropertyInputSchema = z.object({
  propertyAmenityId: z.uuid(),
})
export type PromoteFromPropertyInput = z.infer<typeof promoteFromPropertyInputSchema>

export const promoteFromUnitInputSchema = z.object({
  unitAmenityId: z.uuid(),
})
export type PromoteFromUnitInput = z.infer<typeof promoteFromUnitInputSchema>

// ---------------------------------------------------------------------------
// Property assignment (property_amenity) inputs
// ---------------------------------------------------------------------------

export const propertyAmenityListInputSchema = z.object({
  propertyId: z.uuid(),
})
export type PropertyAmenityListInput = z.infer<typeof propertyAmenityListInputSchema>

export const addPropertyAmenityInputSchema = z.object({
  propertyId: z.uuid(),
  organizationAmenityId: z.uuid(),
})
export type AddPropertyAmenityInput = z.infer<typeof addPropertyAmenityInputSchema>

export const addFreeformPropertyAmenityInputSchema = z.object({
  propertyId: z.uuid(),
  label: z.string().trim().min(1, 'Amenity label is required').max(100, 'Label must be at most 100 characters'),
  description: z.string().trim().max(2000).optional(),
  iconKey: zAmenityIconKey.optional(),
  colorKey: zTagColorKey.optional(),
})
export type AddFreeformPropertyAmenityInput = z.infer<typeof addFreeformPropertyAmenityInputSchema>

export const updatePropertyAmenityInputSchema = z.object({
  propertyAmenityId: z.uuid(),
  label: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(2000).optional(),
  iconKey: zAmenityIconKey.optional(),
  colorKey: zTagColorKey.optional(),
  isReservable: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
})
export type UpdatePropertyAmenityInput = z.infer<typeof updatePropertyAmenityInputSchema>

export const removePropertyAmenityInputSchema = z.object({
  propertyAmenityId: z.uuid(),
})
export type RemovePropertyAmenityInput = z.infer<typeof removePropertyAmenityInputSchema>

export const reorderPropertyAmenitiesInputSchema = z.object({
  propertyId: z.uuid(),
  orderedIds: z.array(z.uuid()).min(1),
})
export type ReorderPropertyAmenitiesInput = z.infer<typeof reorderPropertyAmenitiesInputSchema>

// Bulk-replace a property's catalog-backed amenities (multi-select) — freeform rows untouched.
export const setPropertyAmenitiesInputSchema = z.object({
  propertyId: z.uuid(),
  organizationAmenityIds: z.array(z.uuid()),
})
export type SetPropertyAmenitiesInput = z.infer<typeof setPropertyAmenitiesInputSchema>

// ---------------------------------------------------------------------------
// Property amenity gallery (property_amenity_image) inputs
// ---------------------------------------------------------------------------

export const amenityGalleryListInputSchema = z.object({
  propertyAmenityId: z.uuid(),
})
export type AmenityGalleryListInput = z.infer<typeof amenityGalleryListInputSchema>

export const amenityGalleryAddInputSchema = z.object({
  propertyAmenityId: z.uuid(),
  // Opaque S3 key only — never a full URL (project S3 rule); returned by the presign procedure.
  objectKey: z.string().trim().min(1),
  contentType: z.string().trim().min(1),
  byteLength: z.number().int().positive(),
})
export type AmenityGalleryAddInput = z.infer<typeof amenityGalleryAddInputSchema>

export const amenityGalleryReorderInputSchema = z.object({
  propertyAmenityId: z.uuid(),
  // Full ordered list of image IDs — index 0 becomes the cover.
  orderedIds: z.array(z.uuid()).min(1),
})
export type AmenityGalleryReorderInput = z.infer<typeof amenityGalleryReorderInputSchema>

export const amenityGalleryRemoveInputSchema = z.object({
  imageId: z.uuid(),
})
export type AmenityGalleryRemoveInput = z.infer<typeof amenityGalleryRemoveInputSchema>

// ---------------------------------------------------------------------------
// Unit assignment (unit_amenity) inputs
// ---------------------------------------------------------------------------

export const unitAmenityListInputSchema = z.object({
  unitId: z.uuid(),
})
export type UnitAmenityListInput = z.infer<typeof unitAmenityListInputSchema>

export const unitAmenityListByPropertyInputSchema = z.object({
  propertyId: z.uuid(),
})
export type UnitAmenityListByPropertyInput = z.infer<typeof unitAmenityListByPropertyInputSchema>

// Bulk-replace a unit's catalog-backed amenities (multi-select) — freeform rows untouched.
export const setUnitAmenitiesInputSchema = z.object({
  unitId: z.uuid(),
  organizationAmenityIds: z.array(z.uuid()),
})
export type SetUnitAmenitiesInput = z.infer<typeof setUnitAmenitiesInputSchema>

export const addFreeformUnitAmenityInputSchema = z.object({
  unitId: z.uuid(),
  label: z.string().trim().min(1, 'Amenity label is required').max(100, 'Label must be at most 100 characters'),
  iconKey: zAmenityIconKey.optional(),
  colorKey: zTagColorKey.optional(),
})
export type AddFreeformUnitAmenityInput = z.infer<typeof addFreeformUnitAmenityInputSchema>

export const removeUnitAmenityInputSchema = z.object({
  unitAmenityId: z.uuid(),
})
export type RemoveUnitAmenityInput = z.infer<typeof removeUnitAmenityInputSchema>

export const bulkAddUnitAmenitiesInputSchema = z.object({
  unitIds: z.array(z.uuid()).min(1),
  organizationAmenityIds: z.array(z.uuid()).min(1),
})
export type BulkAddUnitAmenitiesInput = z.infer<typeof bulkAddUnitAmenitiesInputSchema>

export const bulkRemoveUnitAmenitiesInputSchema = z.object({
  unitIds: z.array(z.uuid()).min(1),
  organizationAmenityIds: z.array(z.uuid()).min(1),
})
export type BulkRemoveUnitAmenitiesInput = z.infer<typeof bulkRemoveUnitAmenitiesInputSchema>
