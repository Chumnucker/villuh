import { Badge, TagBadge, toTagBadgeVariant, cn } from "@villuh/ui"

/**
 * One denormalized amenity display row (D-23). Catalog-backed and freeform
 * amenities carry the same denormalized `label`/`iconKey`/`colorKey`, so this
 * component never branches on a catalog FK — it renders purely from these fields.
 */
export type AmenityChip = {
  id: string
  label: string
  iconKey: string
  colorKey: string
}

/**
 * Read-only colored icon+label chips (D-14). No dropdown, no add/remove — a pure
 * display primitive shared by the property About tab, the amenity sheet preview,
 * and the units-table column. Pass `max` to cap visible chips and render a `+N`
 * overflow badge (used by the dense units column, Plan 08).
 */
export function AmenityChipRow({
  amenities,
  max,
  className,
}: {
  amenities: readonly AmenityChip[]
  /** Cap visible chips; the remainder collapse into a trailing `+N` badge. */
  max?: number
  className?: string
}) {
  if (amenities.length === 0) return null

  const visible =
    max != null && amenities.length > max ? amenities.slice(0, max) : amenities
  const overflowCount = amenities.length - visible.length

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {visible.map((amenity) => (
        <TagBadge
          key={amenity.id}
          variant={toTagBadgeVariant(amenity.colorKey)}
          icon={amenity.iconKey}
        >
          {amenity.label}
        </TagBadge>
      ))}
      {overflowCount > 0 ? (
        <Badge variant="outline">+{overflowCount}</Badge>
      ) : null}
    </div>
  )
}
