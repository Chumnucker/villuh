import {
  PARKING_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
  type ParkingType,
  type PropertyType,
} from "@villuh/server/schemas/properties"

/** Human-readable property type label, or `null` when unset. Falls back to the
 * raw stored value so a DB migrated ahead of this deploy still renders. */
export function propertyTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return PROPERTY_TYPE_LABELS[value as PropertyType] ?? value
}

/** Combines parking type + space count into one display string
 * (e.g. "Garage · 2 spaces"), or `null` when neither is set. */
export function formatParking(
  parkingType: string | null | undefined,
  parkingSpaces: number | null | undefined
): string | null {
  if (!parkingType && !parkingSpaces) return null
  if (parkingType === "none") return PARKING_TYPE_LABELS.none
  const label = parkingType
    ? (PARKING_TYPE_LABELS[parkingType as ParkingType] ?? parkingType)
    : null
  if (!parkingSpaces) return label
  const spaces = `${parkingSpaces} ${parkingSpaces === 1 ? "space" : "spaces"}`
  return label ? `${label} · ${spaces}` : spaces
}
