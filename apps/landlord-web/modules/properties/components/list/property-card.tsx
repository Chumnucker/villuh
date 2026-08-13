"use client"

import Link from "next/link"
import { Badge, PlatformIcon, TagBadge, toTagBadgeVariant } from "@villuh/ui"
import { ROUTES } from "@/app/routes"

export const PROPERTY_CARD_GRID_CLASS =
  "grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6"
export const PROPERTY_CARD_SKELETON_COUNT = 8

const CARD_SHELL_CLASS =
  "flex flex-col rounded-4xl bg-card border dark:ring-foreground/10"

/** Placeholder fills — `bg-muted` vanishes on light `bg-card`; ink alpha keeps shape readable. */
const SKELETON_COVER_CLASS = "bg-foreground/8"
const SKELETON_BAR_CLASS = "rounded bg-foreground/12"

export type PropertyCardTag = {
  id: string
  name: string
  icon: string
  color: string
}

export type PropertyCardData = {
  id: string
  name: string
  city: string | null
  region: string | null
  street: string | null
  unitCount: number
  /** Presigned GET URL for the first (lowest sort_order) gallery image, if any. */
  coverImageUrl?: string | null
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
  const addressLine =
    [property.city, property.region].filter(Boolean).join(", ") ||
    property.street
  const tags = property.tags ?? []
  const visibleTags = tags.slice(0, VISIBLE_TAG_LIMIT)
  const overflowCount = tags.length - visibleTags.length

  return (
    <Link
      href={ROUTES.propertyDetail(property.id)}
      className={`group ${CARD_SHELL_CLASS} transition-all hover:ring-foreground/10`}
    >
      <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-t-4xl bg-muted">
        {property.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs are short-lived and per-org; not worth Next/Image remote-pattern config.
          <img
            src={property.coverImageUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <PlatformIcon
            icon="IconHouse"
            size={32}
            className="text-muted-foreground"
          />
        )}
      </div>

      <div className="flex flex-col gap-2 p-6">
        <h3 className="font-heading text-base font-medium text-foreground">
          {property.name}
        </h3>

        <div className="flex items-center gap-1.5">
          {addressLine ? (
            <p className="truncate text-sm text-muted-foreground">
              {addressLine}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">•</p>
          <p className="text-sm text-muted-foreground">
            {property.unitCount} units
          </p>
        </div>

        {visibleTags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1">
            {visibleTags.map((tag) => (
              <TagBadge
                key={tag.id}
                variant={toTagBadgeVariant(tag.color)}
                icon={tag.icon}
              >
                {tag.name}
              </TagBadge>
            ))}
            {overflowCount > 0 ? (
              <Badge variant="outline">+{overflowCount}</Badge>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  )
}

/** Same geometry as `PropertyCard` (cover + body + lines) so load/empty don't snap.
 * Shimmer is clipped to the card — never paints into grid gaps. */
export function PropertyCardSkeleton() {
  return (
    <div className={`${CARD_SHELL_CLASS} relative overflow-hidden`} aria-hidden>
      <div
        className={`flex h-48 items-center justify-center rounded-t-4xl ${SKELETON_COVER_CLASS}`}
      >
        <PlatformIcon
          icon="IconHouse"
          size={38}
          className="text-foreground/20"
        />
      </div>
      <div className="flex flex-col gap-2 p-6">
        <div className={`h-5 w-2/3 ${SKELETON_BAR_CLASS}`} />
        <div className="flex h-5 items-center gap-1.5">
          <div className={`h-3.5 w-28 ${SKELETON_BAR_CLASS}`} />
          <div className={`size-1 shrink-0 rounded-full bg-foreground/12`} />
          <div className={`h-3.5 w-14 ${SKELETON_BAR_CLASS}`} />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 shimmer text-foreground shimmer-bg shimmer-color-foreground/20" />
    </div>
  )
}
