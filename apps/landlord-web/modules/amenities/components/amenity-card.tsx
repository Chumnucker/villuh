"use client"

import {
  Badge,
  PlatformIcon,
  cn,
  isPlatformIconName,
} from "@villuh/ui"
import { amenityOverlays } from "@/modules/amenities/lib/amenities.overlays"
import {
  AMENITY_ICON_COLOR_CLASSES,
  type TagColorKey,
} from "../lib/amenity-icons"

export type AmenityCardData = {
  id: string
  label: string
  description: string | null
  iconKey: string
  colorKey: string
  isReservable: boolean
}

/**
 * One property amenity as a card (D-42): a colored icon tile, name, description
 * snippet, and a "Reservable" badge. Clicking opens the URL-backed amenity
 * sheet keyed by this assignment's id — so the open sheet is shareable/deep-linkable
 * (D-40). Photo count is intentionally omitted: `amenities.property.list` does
 * not expose one and a per-card `gallery.list` would be an N+1.
 */
export function AmenityCard({ amenity }: { amenity: AmenityCardData }) {
  const sheet = amenityOverlays.use("sheet")

  return (
    <button
      type="button"
      onClick={() => sheet.open(amenity.id)}
      className="flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-ring/40 hover:bg-accent/40"
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted",
          AMENITY_ICON_COLOR_CLASSES[amenity.colorKey as TagColorKey]
        )}
      >
        <PlatformIcon
          icon={isPlatformIconName(amenity.iconKey) ? amenity.iconKey : "IconStar"}
          size={18}
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{amenity.label}</span>
          {amenity.isReservable ? (
            <Badge variant="secondary" className="shrink-0">
              Reservable
            </Badge>
          ) : null}
        </div>
        {amenity.description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {amenity.description}
          </p>
        ) : null}
      </div>
      <PlatformIcon
        icon="IconChevronRight"
        size={16}
        className="mt-1 shrink-0 text-muted-foreground"
      />
    </button>
  )
}
