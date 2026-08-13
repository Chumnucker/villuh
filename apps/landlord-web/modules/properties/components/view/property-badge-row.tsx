"use client"

import { TagBadge, toTagBadgeVariant } from "@villuh/ui"
import { trpc } from "@villuh/api"
import { propertyTypeLabel } from "@/modules/properties/lib/property-display"
import { usePropertyDetail } from "@/modules/properties/providers/property-detail-provider"

/**
 * Property type chip followed by the property's tags, for the detail header.
 * Read-only by design — there's no "Add tag" affordance and no per-chip menu;
 * both attaching and removing tags live in property settings so the header
 * stays a summary rather than a second editing surface.
 *
 * Self-sufficient: reads the property from `PropertyDetailProvider`, so it
 * must render as a child of it.
 */
export function PropertyBadgeRow() {
  const { property } = usePropertyDetail()
  const { data } = trpc.tags.listPropertyTags.useQuery({
    propertyId: property.id,
  })

  const tags = data?.tags ?? []
  const propertyType = property.propertyType

  if (!propertyType && tags.length === 0) return null

  return (
    <div className="flex flex-row flex-wrap items-center gap-1.5">
      {propertyType ? (
        // `property_type` is a Postgres enum, so the stored value is also the
        // TagBadge variant name — no color map needed here.
        <TagBadge variant={propertyType}>
          {propertyTypeLabel(propertyType)}
        </TagBadge>
      ) : null}

      {tags.map((tag) => (
        <TagBadge
          key={tag.id}
          variant={toTagBadgeVariant(tag.colorKey)}
          icon={tag.iconKey}
        >
          {tag.label}
        </TagBadge>
      ))}
    </div>
  )
}
