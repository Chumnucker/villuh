"use client"

import { useParams } from "next/navigation"
import { Button, EmptyState, Page } from "@villuh/ui"
import { FloorPlansSection } from "@/modules/properties/components/settings/units/floor-plans"
import { SettingsSection } from "@/modules/properties/components/settings/section"
import { unitOverlays } from "@/modules/units/lib/units.overlays"

/**
 * Unit-level configuration for this property. Floor plans are live (D-38); the
 * "Unit defaults" section is still a placeholder — property-scoped unit defaults
 * have no backing table yet.
 */
export function PropertySettingsUnitsTemplate() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const statuses = unitOverlays.use("statuses")

  return (
    <Page.Content className="gap-10">
      <FloorPlansSection propertyId={propertyId} />

      <SettingsSection
        title="Unit defaults"
        icon="IconDoor"
        description="Values pre-filled whenever a new unit is added to this property."
        className="grid-cols-1 sm:grid-cols-1"
        action={
          <Button variant="outline" size="sm" onClick={() => statuses.open()}>
            Unit statuses
          </Button>
        }
      >
        <EmptyState
          icon="IconSettingsGear2"
          title="Defaults coming soon"
          description="Default status, base rent, and label numbering for this property's units will be configurable here. Unit statuses are organization-wide for now."
          className="rounded-2xl border border-dashed border-border py-12"
        />
      </SettingsSection>
    </Page.Content>
  )
}
