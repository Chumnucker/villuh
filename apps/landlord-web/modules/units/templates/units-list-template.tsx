"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Page,
  PlatformIcon,
} from "@villuh/ui"
import { ROUTES } from "@/app/routes"
import { PlanLimitGate } from "@/modules/app/components/plan-limit/plan-limit-gate"
import { useUser } from "@/modules/app/providers/me-provider"
import { ArchiveUnitDialog } from "@/modules/units/components/archive-unit-dialog"
import {
  UnitFormSheet,
  type UnitRow,
} from "@/modules/units/components/form/unit-form-sheet"
import { UnitsList } from "@/modules/units/components/list"

export function UnitsListTemplate() {
  const { user } = useUser()
  const isAdmin = user.org.permissions.admin
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<UnitRow | undefined>(undefined)
  const [archivingUnit, setArchivingUnit] = useState<UnitRow | undefined>(
    undefined
  )

  function openCreate() {
    setEditingUnit(undefined)
    setSheetOpen(true)
  }

  return (
    <Page.Shell>
      <Page.Header>
        <Page.Title>Units</Page.Title>
        <Page.Actions>
          <PlanLimitGate resource="units">
            <Button onClick={openCreate}>
              <PlatformIcon
                icon="IconPlusSmall"
                size={16}
                data-icon="inline-start"
              />
              Add unit
            </Button>
          </PlanLimitGate>
          {isAdmin ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <PlatformIcon icon="IconDotGrid1x3Horizontal" size={16} />
                  <span className="sr-only">Units options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={ROUTES.settingsUnitStatuses}>
                    <PlatformIcon icon="IconCircleCheck" size={16} />
                    Manage statuses
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </Page.Actions>
      </Page.Header>

      <Page.Content>
        <UnitsList
          onEdit={(unit) => {
            setEditingUnit(unit)
            setSheetOpen(true)
          }}
          onArchive={setArchivingUnit}
        />
      </Page.Content>

      <UnitFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={editingUnit ? "edit" : "create"}
        unit={editingUnit}
      />
      <ArchiveUnitDialog
        open={Boolean(archivingUnit)}
        onOpenChange={(open) => {
          if (!open) setArchivingUnit(undefined)
        }}
        unitId={archivingUnit?.id ?? ""}
        unitLabel={archivingUnit?.label ?? ""}
      />
    </Page.Shell>
  )
}
