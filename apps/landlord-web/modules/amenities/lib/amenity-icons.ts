import { AMENITY_ICON_KEYS, TAG_COLOR_KEYS } from "@villuh/server/schemas/amenities"
import type { AmenityIconKey } from "@villuh/server/schemas/amenities"
import type { TagColorKey } from "@villuh/server/schemas/tags"

/**
 * The 8 shared `tag_color` swatch fills (D-04) — reused verbatim from
 * `tag-icon-color-picker.tsx`. Amenities never introduce a new palette.
 */
export const AMENITY_SWATCH_CLASSES: Record<TagColorKey, string> = {
  slate: "bg-slate-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  violet: "bg-violet-500",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  sky: "bg-sky-500",
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  rose: "bg-rose-500",
  lime: "bg-lime-500",
  yellow: "bg-yellow-500",
}

/** Icon ink matching the picked palette color — mirrors the tag picker's map. */
export const AMENITY_ICON_COLOR_CLASSES: Record<TagColorKey, string> = {
  slate: "text-slate-500",
  blue: "text-blue-500",
  green: "text-green-500",
  amber: "text-amber-500",
  orange: "text-orange-500",
  red: "text-red-500",
  violet: "text-violet-500",
  teal: "text-teal-500",
  cyan: "text-cyan-500",
  sky: "text-sky-500",
  indigo: "text-indigo-500",
  purple: "text-purple-500",
  pink: "text-pink-500",
  rose: "text-rose-500",
  lime: "text-lime-500",
  yellow: "text-yellow-500",
}

export { AMENITY_ICON_KEYS, TAG_COLOR_KEYS }
export type { AmenityIconKey, TagColorKey }
