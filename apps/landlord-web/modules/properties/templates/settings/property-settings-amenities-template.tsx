"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import { Button, EmptyState, Page, SkeletonBox } from "@villuh/ui"
import { trpc } from "@villuh/api"
import { AmenityCard } from "@/modules/amenities/components/amenity-card"
import { AmenityChipRow } from "@/modules/amenities/components/amenity-chip-row"
import { AmenityPicker } from "@/modules/amenities/components/amenity-picker"
import { amenityOverlays } from "@/modules/amenities/lib/amenities.overlays"
import { SettingsSection } from "@/modules/properties/components/settings/section"
import {
  AMENITY_SCOPES,
  type AmenityScope,
} from "@villuh/server/schemas/amenities"

const SCOPE_LABELS: Record<AmenityScope, string> = {
  property: "Property",
  unit: "Unit",
  both: "Property & unit",
}

/**
 * The real two-section amenities surface (D-39): the property's own amenities as
 * a clickable card grid (each opens the URL-backed sheet) plus a search-or-create
 * "Add amenity" control, and a read-only view of the org catalog with a "Manage
 * catalog…" action opening the catalog dialog.
 */
export function PropertySettingsAmenitiesTemplate() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const catalog = amenityOverlays.use("catalog")

  const amenitiesQuery = trpc.amenities.property.list.useQuery({ propertyId })
  const catalogQuery = trpc.amenities.catalog.list.useQuery()

  const amenities = amenitiesQuery.data?.amenities ?? []
  const catalogRows = useMemo(
    () => catalogQuery.data?.amenities ?? [],
    [catalogQuery.data]
  )

  const catalogByScope = useMemo(
    () =>
      AMENITY_SCOPES.map((scope) => ({
        scope,
        rows: catalogRows.filter((row) => row.scope === scope),
      })).filter((group) => group.rows.length > 0),
    [catalogRows]
  )

  return (
    <Page.Content className="gap-6">
      <SettingsSection
        title="Property amenities"
        icon="IconStar"
        description="What this property offers — shown to residents on the listing and the resident portal."
        className="grid-cols-1 sm:grid-cols-1"
      >
        {amenitiesQuery.isLoading ? (
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

        <AmenityPicker propertyId={propertyId} />
      </SettingsSection>

      <SettingsSection
        title="Amenity catalog"
        icon="IconClipboard2"
        description="Your organization's reusable amenity list, shared across every property and unit."
        className="grid-cols-1 sm:grid-cols-1"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => catalog.open()}
          >
            Manage catalog…
          </Button>
        }
      >
        {catalogQuery.isLoading ? (
          <SkeletonBox className="h-8 w-full rounded-2xl" />
        ) : catalogByScope.length === 0 ? (
          <EmptyState
            icon="IconPlusSmall"
            title="No catalog amenities yet"
            description="Create reusable amenities once and attach them to any property or unit."
            className="rounded-2xl border border-dashed border-border py-10"
          />
        ) : (
          <div className="flex flex-col gap-3">
            {catalogByScope.map((group) => (
              <div key={group.scope} className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {SCOPE_LABELS[group.scope]}
                </p>
                <AmenityChipRow
                  amenities={group.rows.map((row) => ({
                    id: row.id,
                    label: row.name,
                    iconKey: row.iconKey,
                    colorKey: row.colorKey,
                  }))}
                />
              </div>
            ))}
          </div>
        )}
      </SettingsSection>
    </Page.Content>
  )
}
