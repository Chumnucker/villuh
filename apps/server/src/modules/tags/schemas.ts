import { z } from 'zod'

/**
 * Fixed tag palette (D-21, UI-SPEC "Tag & status palette") — Zod enum rejects free hex /
 * arbitrary icon names at the API boundary (T-03-16), matching the locked 14 icon / 8 color
 * keys. Shared by `tags.*` mutations and the landlord TagPicker UI (Plan 07).
 */
export const TAG_ICON_KEYS = [
  'IconBuildings',
  'IconDoor',
  'IconHomeDoor',
  'IconPeople',
  'IconStar',
  'IconFlag',
  'IconKey1',
  'IconMapPin',
  'IconLeaf',
  'IconFlame',
  'IconBolt',
  'IconHeart',
  'IconCircleCheck',
  'IconWrench',
] as const

export const zTagIconKey = z.enum(TAG_ICON_KEYS)
export type TagIconKey = z.infer<typeof zTagIconKey>

export const TAG_COLOR_KEYS = ['slate', 'blue', 'green', 'amber', 'orange', 'red', 'violet', 'teal'] as const

export const zTagColorKey = z.enum(TAG_COLOR_KEYS)
export type TagColorKey = z.infer<typeof zTagColorKey>

export const createOrganizationTagInputSchema = z.object({
  name: z.string().trim().min(1, 'Tag name is required').max(100, 'Name must be at most 100 characters'),
  iconKey: zTagIconKey,
  colorKey: zTagColorKey,
})
export type CreateOrganizationTagInput = z.infer<typeof createOrganizationTagInputSchema>

// D-19: same write permission as promote; rename/re-icon/re-color allowed on any catalog row.
export const updateOrganizationTagInputSchema = z.object({
  organizationTagId: z.uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  iconKey: zTagIconKey.optional(),
  colorKey: zTagColorKey.optional(),
})
export type UpdateOrganizationTagInput = z.infer<typeof updateOrganizationTagInputSchema>

export const organizationTagIdInputSchema = z.object({
  organizationTagId: z.uuid(),
})

export const propertyIdInputSchema = z.object({
  propertyId: z.uuid(),
})

// Freeform tag (D-17): display-only property_tag row, organizationTagId stays null until promoted.
export const addFreeformTagInputSchema = z.object({
  propertyId: z.uuid(),
  label: z.string().trim().min(1, 'Tag label is required').max(100, 'Label must be at most 100 characters'),
  iconKey: zTagIconKey,
  colorKey: zTagColorKey,
})
export type AddFreeformTagInput = z.infer<typeof addFreeformTagInputSchema>

export const attachOrganizationTagInputSchema = z.object({
  propertyId: z.uuid(),
  organizationTagId: z.uuid(),
})
export type AttachOrganizationTagInput = z.infer<typeof attachOrganizationTagInputSchema>

// Bulk-replace a property's catalog-backed tags (TagPicker multi-select) — freeform rows untouched.
export const setPropertyTagsInputSchema = z.object({
  propertyId: z.uuid(),
  organizationTagIds: z.array(z.uuid()),
})
export type SetPropertyTagsInput = z.infer<typeof setPropertyTagsInputSchema>

export const propertyTagIdInputSchema = z.object({
  propertyTagId: z.uuid(),
})

export const promoteFreeformTagInputSchema = z.object({
  propertyTagId: z.uuid(),
})
export type PromoteFreeformTagInput = z.infer<typeof promoteFreeformTagInputSchema>
