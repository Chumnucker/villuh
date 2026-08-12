import { TAG_COLOR_KEYS, TAG_ICON_KEYS, type TagColorKey } from "@villuh/server/schemas/tags"

export { TAG_COLOR_KEYS, TAG_ICON_KEYS }
export type { TagColorKey, TagIconKey } from "@villuh/server/schemas/tags"

/** Soft `/15` badge fill (UI-SPEC "Tag & status palette") — shared by tag chips and status badges. */
export const TAG_BADGE_CLASSES: Record<TagColorKey, string> = {
  slate: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  green: "bg-green-500/15 text-green-700 dark:text-green-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  orange: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  red: "bg-red-500/15 text-red-700 dark:text-red-300",
  violet: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  teal: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
}

/** Solid swatch used inside the fixed-palette picker (not for badges — those use the soft fill above). */
export const TAG_SWATCH_CLASSES: Record<TagColorKey, string> = {
  slate: "bg-slate-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  violet: "bg-violet-500",
  teal: "bg-teal-500",
}

export const DEFAULT_TAG_ICON_KEY = TAG_ICON_KEYS[0]
export const DEFAULT_TAG_COLOR_KEY = TAG_COLOR_KEYS[0]
