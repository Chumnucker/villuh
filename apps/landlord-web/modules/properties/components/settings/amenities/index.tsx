"use client"

import { useParams } from "next/navigation"
import { Button, EmptyState, PlatformIcon, SkeletonBox } from "@villuh/ui"
import { trpc } from "@villuh/api"
import { useUser } from "@/modules/app/providers/me-provider"
import { AmenityCard } from "@/modules/amenities/components/amenity-card"
import { amenityOverlays } from "@/modules/amenities/lib/amenities.overlays"
import { SettingsSection } from "../section"

/**
 * The property amenities surface: the property's own amenities as a clickable
 * card grid (each opens the URL-backed sheet). The catalog is no longer shown
 * or managed here — it moves to organization settings. Adding amenities happens
 * through the "Add amenities" dialog opened from this section's header, which is
 * a staged multi-select form (save to apply).
 */
export function PropertyAmenitiesSection() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const { user } = useUser()
  const canWrite = user.org.permissions.write
  const add = amenityOverlays.use("add")

  const {
    data: { amenities } = { amenities: [] },
    isLoading,
  } = trpc.amenities.property.list.useQuery({ propertyId })

  return (
    <SettingsSection
      title="Property amenities"
      icon="IconStar"
      description="What this property offers — shown to residents on the listing and the resident portal."
      className="grid-cols-1 sm:grid-cols-1"
      action={
        canWrite ? (
          <Button variant="outline" size="sm" onClick={() => add.open()}>
            <PlatformIcon icon="IconPlusSmall" size={16} />
            Add amenities
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SkeletonBox className="h-20 rounded-2xl" />
          <SkeletonBox className="h-20 rounded-2xl" />
        </div>
      ) : amenities.length === 0 ? (
        <EmptyState
          icon="IconStar"
          title="No amenities yet"
          description="Add the amenities this property has, like parking, laundry, or a gym."
          className="rounded-2xl border border-dashed border-border py-10"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {amenities.map((amenity) => (
            <AmenityCard
              key={amenity.id}
              amenity={{
                id: amenity.id,
                label: amenity.label,
                description: amenity.description,
                iconKey: amenity.iconKey,
                colorKey: amenity.colorKey,
                isReservable: amenity.isReservable,
              }}
            />
          ))}
        </div>
      )}
    </SettingsSection>
  )
}
