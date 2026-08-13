"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { Button, Page, PlatformIcon } from "@villuh/ui"
import { PlanLimitGate } from "@/modules/app/components/plan-limit/plan-limit-gate"
import { ArchiveUnitDialog } from "@/modules/units/components/archive-unit-dialog"
import {
  UnitFormSheet,
  type UnitRow,
} from "@/modules/units/components/form/unit-form-sheet"
import { UnitsList } from "@/modules/units/components/list"

export function PropertyUnitsTemplate() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<UnitRow | undefined>(undefined)
  const [archivingUnit, setArchivingUnit] = useState<UnitRow | undefined>(
    undefined
  )

  return (
    <Page.Content>
      <div className="flex justify-end">
        <PlanLimitGate resource="units" action="Adding a unit">
          <Button
            size="sm"
            onClick={() => {
              setEditingUnit(undefined)
              setSheetOpen(true)
            }}
          >
            <PlatformIcon icon="IconPlusSmall" size={16} data-icon="inline-start" />
            Add unit
          </Button>
        </PlanLimitGate>
      </div>

      <UnitsList
        lockedPropertyId={propertyId}
        filterDisplay="compact"
        onEdit={(unit) => {
          setEditingUnit(unit)
          setSheetOpen(true)
        }}
        onArchive={setArchivingUnit}
      />

      <UnitFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={editingUnit ? "edit" : "create"}
        unit={editingUnit}
        // Only lock the property on create — editing keeps the global flow's
        // freedom to reassign a unit to a different property.
        lockedPropertyId={editingUnit ? undefined : propertyId}
      />
      <ArchiveUnitDialog
        open={Boolean(archivingUnit)}
        onOpenChange={(open) => {
          if (!open) setArchivingUnit(undefined)
        }}
        unitId={archivingUnit?.id ?? ""}
        unitLabel={archivingUnit?.label ?? ""}
        // Redirect back to this property (not the global units list) once archived.
        propertyId={propertyId}
      />
    </Page.Content>
  )
}
