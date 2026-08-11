"use client"

import Link from "next/link"
import { Badge, PlatformIcon } from "@villuh/ui"
import { ROUTES } from "@/app/routes"

export type PropertyCardTag = { id: string; name: string; icon: string; color: string }

export type PropertyCardData = {
  id: string
  name: string
  city: string | null
  region: string | null
  street: string | null
  unitCount: number
  /** Empty until Plan 07 wires TagPicker + the tags catalog into this list payload. */
  tags?: PropertyCardTag[]
}

const VISIBLE_TAG_LIMIT = 3

/**
 * Screen 1 card composition (UI-SPEC "Claude discretion — locked"): cover placeholder,
 * name, single-line address, up to 3 tag chips, `{unitCount} units` footer. No
 * occupancy/rent/alerts (D-05/D-09) — the entire card is a link to the detail page.
 */
export function PropertyCard({ property }: { property: PropertyCardData }) {
  const addressLine = [property.city, property.region].filter(Boolean).join(", ") || property.street
  const tags = property.tags ?? []
  const visibleTags = tags.slice(0, VISIBLE_TAG_LIMIT)
  const overflowCount = tags.length - visibleTags.length

  return (
    <Link
      href={ROUTES.propertyDetail(property.id)}
      className="group flex flex-col rounded-4xl bg-card shadow-md ring-1 ring-foreground/5 transition-all hover:shadow-lg hover:ring-foreground/10 dark:ring-foreground/10"
    >
      <div className="flex h-40 items-center justify-center rounded-t-4xl bg-muted">
        <PlatformIcon icon="IconBuildings" size={32} className="text-muted-foreground" />
      </div>

      <div className="flex flex-col gap-2 p-6">
        <h3 className="font-heading text-base font-medium text-foreground">{property.name}</h3>
        {addressLine ? (
          <p className="truncate text-sm text-muted-foreground">{addressLine}</p>
        ) : null}

        {visibleTags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1">
            {visibleTags.map((tag) => (
              <Badge key={tag.id} variant="outline">
                <PlatformIcon icon={tag.icon as never} size={12} data-icon="inline-start" />
                {tag.name}
              </Badge>
            ))}
            {overflowCount > 0 ? <Badge variant="outline">+{overflowCount}</Badge> : null}
          </div>
        ) : null}

        <p className="text-sm text-muted-foreground">{property.unitCount} units</p>
      </div>
    </Link>
  )
}
