import { z } from 'zod'

/** Shared by tRPC `units.create` and the landlord create-unit form. */
export const createUnitInputSchema = z.object({
  propertyId: z.uuid(),
  label: z.string().trim().min(1, 'Unit label is required').max(100, 'Label must be at most 100 characters'),
  squareFootage: z.number().int().positive().optional(),
  // Integer cents (A3) — never float dollars.
  baseRentCents: z.number().int().min(0),
  // Manual assignment in Phase 3 (D-28); optional until the landlord assigns a status.
  statusId: z.uuid().optional(),
})

export type CreateUnitInput = z.infer<typeof createUnitInputSchema>

export const updateUnitInputSchema = createUnitInputSchema.partial().extend({
  unitId: z.uuid(),
})

export type UpdateUnitInput = z.infer<typeof updateUnitInputSchema>

export const unitIdInputSchema = z.object({
  unitId: z.uuid(),
})

export const listUnitsInputSchema = z
  .object({
    propertyId: z.uuid().optional(),
  })
  .optional()
