import { z } from 'zod'
import {
  filterEmptyFlagSchema,
  filterIdListSchema,
  listQueryFields,
  listSearchSchema,
  numericFilterPredicatesSchema,
} from '@villuh/server/schemas/filters'

/** Shared by tRPC `units.create` and the landlord create-unit form. */
export const createUnitInputSchema = z.object({
  propertyId: z.uuid(),
  label: z.string().trim().min(1, 'Unit label is required').max(100, 'Label must be at most 100 characters'),
  squareFootage: z.number().int().positive().optional(),
  // Integer cents (A3) — never float dollars.
  baseRentCents: z.number().int().min(0),
  // Manual assignment in Phase 3 (D-28); optional until the landlord assigns a status.
  statusId: z.uuid().optional(),
  // Optional floor-plan link + inherited-override fields (D-27). A unit inherits from its
  // plan when a field is absent; a supplied value overrides. Values are never copied from
  // the plan into these columns (D-19) — resolution is client-side (D-20).
  floorPlanId: z.uuid().optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().multipleOf(0.25).min(0).max(20).optional(),
})

export type CreateUnitInput = z.infer<typeof createUnitInputSchema>

// A unit's property is immutable after creation (D-27a): reassignment is the only route to a
// unit inheriting from another property's plan, which D-27 forbids. `omit` drops propertyId at
// the type/runtime boundary so `units.update` can never carry it.
export const updateUnitInputSchema = createUnitInputSchema.omit({ propertyId: true }).partial().extend({
  unitId: z.uuid(),
})

export type UpdateUnitInput = z.infer<typeof updateUnitInputSchema>

export const unitIdInputSchema = z.object({
  unitId: z.uuid(),
})

/** Sortable columns — ids match the frontend column accessors. */
export const UNIT_SORT_KEYS = [
  'label',
  'propertyName',
  'status',
  'baseRent',
] as const

export const listUnitsInputSchema = z
  .object({
    ...listQueryFields(UNIT_SORT_KEYS),
    search: listSearchSchema,
    propertyIds: filterIdListSchema,
    excludePropertyIds: filterIdListSchema,
    statusIds: filterIdListSchema,
    excludeStatusIds: filterIdListSchema,
    /** `true` = unassigned only; `false` = must have a status. */
    statusEmpty: filterEmptyFlagSchema,
    /** Predicates are AND-ed. Values are integer cents. */
    baseRentCents: numericFilterPredicatesSchema,
    /** Predicates are AND-ed. */
    squareFootage: numericFilterPredicatesSchema,
    squareFootageEmpty: filterEmptyFlagSchema,
  })
  .optional()

export type ListUnitsInput = NonNullable<z.infer<typeof listUnitsInputSchema>>
