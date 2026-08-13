import { z } from 'zod'
// Package subpath, not a relative `.js` path — this module is also bundled by the
// landlord web app, whose bundler can't resolve ESM `.js` specifiers back to `.ts`.
import { zTagColorKey, zTagIconKey } from '@villuh/server/schemas/tags'

/** Admin-only status catalog create (D-27) — custom statuses default isSystem=false.
 * icon/color share the locked tag palette (D-21), which is also the enum backing
 * `unit_statuses.icon_key`/`color_key`. */
export const createUnitStatusInputSchema = z.object({
  name: z.string().trim().min(1, 'Status name is required').max(100, 'Name must be at most 100 characters'),
  iconKey: zTagIconKey,
  colorKey: zTagColorKey,
})

export type CreateUnitStatusInput = z.infer<typeof createUnitStatusInputSchema>

// Rename is allowed even for is_system defaults (D-27) — only delete/archive is restricted.
export const updateUnitStatusInputSchema = z.object({
  statusId: z.uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  iconKey: zTagIconKey.optional(),
  colorKey: zTagColorKey.optional(),
})

export type UpdateUnitStatusInput = z.infer<typeof updateUnitStatusInputSchema>

export const reorderUnitStatusesInputSchema = z.object({
  // Full ordered list of status IDs for this org — index becomes sort_order.
  statusIds: z.array(z.uuid()).min(1),
})

export type ReorderUnitStatusesInput = z.infer<typeof reorderUnitStatusesInputSchema>

export const unitStatusIdInputSchema = z.object({
  statusId: z.uuid(),
})
