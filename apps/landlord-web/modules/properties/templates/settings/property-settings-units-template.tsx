"use client"

import { useState } from "react"
import { Button, EmptyState, Page } from "@villuh/ui"
import { SettingsSection } from "@/modules/properties/components/settings/section"
import { ManageUnitStatusesDialog } from "@/modules/units/components/statuses/manage-unit-statuses-dialog"

/**
 * Unit-level configuration for this property. Both sections are placeholders —
 * floor plans and property-scoped unit defaults have no backing tables yet, so
 * the units themselves are still managed from the property's Units tab.
 */
export function PropertySettingsUnitsTemplate() {
  const [statusesOpen, setStatusesOpen] = useState(false)

  return (
    <Page.Content className="gap-10">
      <SettingsSection
        title="Floor plans"
        icon="IconRuler"
        description="Reusable unit layouts — bed/bath counts, square footage, and rent, applied to every unit that shares the plan."
        className="grid-cols-1 sm:grid-cols-1"
      >
        <EmptyState
          icon="IconRuler"
          title="Floor plans coming soon"
          description="Define a layout once and assign it to matching units instead of re-entering the same details per unit."
          className="rounded-2xl border border-dashed border-border py-12"
        />
      </SettingsSection>

      <SettingsSection
        title="Unit defaults"
        icon="IconDoor"
        description="Values pre-filled whenever a new unit is added to this property."
        className="grid-cols-1 sm:grid-cols-1"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusesOpen(true)}
          >
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

      <ManageUnitStatusesDialog
        open={statusesOpen}
        onOpenChange={setStatusesOpen}
      />
    </Page.Content>
  )
}
