import { z } from 'zod'

/** Admin-only status catalog create (D-27) — custom statuses default isSystem=false. */
export const createUnitStatusInputSchema = z.object({
  name: z.string().trim().min(1, 'Status name is required').max(100, 'Name must be at most 100 characters'),
  iconKey: z.string().trim().min(1),
  colorKey: z.string().trim().min(1),
})

export type CreateUnitStatusInput = z.infer<typeof createUnitStatusInputSchema>

// Rename is allowed even for is_system defaults (D-27) — only delete/archive is restricted.
export const updateUnitStatusInputSchema = z.object({
  statusId: z.string().uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  iconKey: z.string().trim().min(1).optional(),
  colorKey: z.string().trim().min(1).optional(),
})

export type UpdateUnitStatusInput = z.infer<typeof updateUnitStatusInputSchema>

export const reorderUnitStatusesInputSchema = z.object({
  // Full ordered list of status IDs for this org — index becomes sort_order.
  statusIds: z.array(z.string().uuid()).min(1),
})

export type ReorderUnitStatusesInput = z.infer<typeof reorderUnitStatusesInputSchema>

export const unitStatusIdInputSchema = z.object({
  statusId: z.string().uuid(),
})
