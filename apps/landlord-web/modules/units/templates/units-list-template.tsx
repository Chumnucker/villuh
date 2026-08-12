"use client"

import Link from "next/link"
import { useState } from "react"
import { trpc } from "@villuh/api"
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Page,
  PlatformIcon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@villuh/ui"
import { ROUTES } from "@/app/routes"
import { PlanLimitGate } from "@/modules/app/components/plan-limit/plan-limit-gate"
import { useUser } from "@/modules/app/providers/me-provider"
import { ArchiveUnitDialog } from "@/modules/units/components/archive-unit-dialog"
import {
  UnitFormSheet,
  type UnitRow,
} from "@/modules/units/components/form/unit-form-sheet"
import { UnitsTable } from "@/modules/units/components/list/units-table"

const ALL_PROPERTIES = "__all__"

export function UnitsListTemplate() {
  const { user } = useUser()
  const isAdmin = user.org.permissions.admin
  const [propertyFilter, setPropertyFilter] = useState(ALL_PROPERTIES)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<UnitRow | undefined>(
    undefined
  )
  const [archivingUnit, setArchivingUnit] = useState<UnitRow | undefined>(
    undefined
  )

  const { data: unitsData, isLoading } = trpc.units.list.useQuery(
    propertyFilter === ALL_PROPERTIES ? {} : { propertyId: propertyFilter }
  )
  const { data: propertiesData } = trpc.properties.list.useQuery()
  const { data: statusesData } = trpc.unitStatuses.list.useQuery()

  const properties = propertiesData?.properties ?? []
  const statuses = statusesData?.statuses ?? []
  const propertyById = new Map(
    properties.map((property) => [property.id, property])
  )
  const statusById = new Map(statuses.map((status) => [status.id, status]))

  const rows =
    unitsData?.units.map((unit) => ({
      id: unit.id,
      label: unit.label,
      squareFootage: unit.squareFootage,
      baseRent: unit.baseRent,
      propertyId: unit.propertyId,
      propertyName: propertyById.get(unit.propertyId)?.name ?? "—",
      status:
        (unit.statusId ? statusById.get(unit.statusId) : undefined) ?? null,
    })) ?? []

  function openCreate() {
    setEditingUnit(undefined)
    setSheetOpen(true)
  }

  function openEdit(unitId: string) {
    const unit = unitsData?.units.find((u) => u.id === unitId)
    if (!unit) return
    setEditingUnit(unit)
    setSheetOpen(true)
  }

  function openArchive(unitId: string) {
    const unit = unitsData?.units.find((u) => u.id === unitId)
    if (!unit) return
    setArchivingUnit(unit)
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
        {properties.length > 0 ? (
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PROPERTIES}>All properties</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-2xl" />
            ))}
          </div>
        ) : rows.length > 0 ? (
          <UnitsTable units={rows} onEdit={openEdit} onArchive={openArchive} />
        ) : (
          <div className="flex flex-col items-center gap-1 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No units yet</p>
            <p className="text-sm text-muted-foreground">
              Create a unit under a property to track rent and availability.
            </p>
          </div>
        )}
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
