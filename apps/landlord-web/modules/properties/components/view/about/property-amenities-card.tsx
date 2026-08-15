"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Page,
  PlatformIcon,
} from "@villuh/ui"
import { trpc } from "@villuh/api"
import { AmenityChipRow } from "@/modules/amenities/components/amenity-chip-row"
import { PropertyDetailsCard } from "@/modules/properties/components/view/about/property-details-card"
import { usePropertyDetail } from "@/modules/properties/providers/property-detail-provider"

/**
 * Real amenities for this property, rendered read-only (D-14). Reading and
 * display only — attaching/removing amenities lives in property settings
 * (Plan 07), so there's no add/remove affordance here. Catalog-backed and
 * freeform amenities render identically through `AmenityChipRow` because both
 * carry denormalized label/icon/color (D-23).
 *
 * Self-sufficient: reads the property id from `PropertyDetailProvider`, so it
 * must render as a child of it.
 */
export function PropertyAmenitiesCard() {
  const { property } = usePropertyDetail()
  const { data } = trpc.amenities.property.list.useQuery({
    propertyId: property.id,
  })

  const amenities = data?.amenities ?? []
  if (amenities.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <PlatformIcon icon="IconStar" size={16} />
          Amenities
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AmenityChipRow amenities={amenities} />
      </CardContent>
    </Card>
  )
}
