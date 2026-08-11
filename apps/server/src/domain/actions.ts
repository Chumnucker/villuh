import { z } from 'zod'

/** Permission action categories (D-09). */
export const ACTION_CATEGORIES = [
  'write',
  'financial',
  'communications',
  'admin',
] as const
export type ActionCategory = (typeof ACTION_CATEGORIES)[number]

export const zActionCategory = z.enum(ACTION_CATEGORIES)
