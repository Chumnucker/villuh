"use client"

import { useState } from "react"
import { trpc } from "@villuh/api"
import {
  Button,
  PlatformIcon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@villuh/ui"
import { PlanLimitGate } from "@/modules/app/components/plan-limit/plan-limit-gate"
import { UnitFormSheet, type UnitRow } from "@/modules/app/components/units/unit-form-sheet"
import { UnitsTable } from "@/modules/app/components/units/units-table"

const ALL_PROPERTIES = "__all__"

export default function UnitsPage() {
  const [propertyFilter, setPropertyFilter] = useState(ALL_PROPERTIES)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<UnitRow | undefined>(undefined)

  const { data: unitsData, isLoading } = trpc.units.list.useQuery(
    propertyFilter === ALL_PROPERTIES ? {} : { propertyId: propertyFilter }
  )
  const { data: propertiesData } = trpc.properties.list.useQuery()
  const { data: statusesData } = trpc.unitStatuses.list.useQuery()

  const properties = propertiesData?.properties ?? []
  const statuses = statusesData?.statuses ?? []
  const propertyById = new Map(properties.map((property) => [property.id, property]))
  const statusById = new Map(statuses.map((status) => [status.id, status]))

  const rows =
    unitsData?.units.map((unit) => ({
      id: unit.id,
      label: unit.label,
      squareFootage: unit.squareFootage,
      baseRent: unit.baseRent,
      propertyId: unit.propertyId,
      propertyName: propertyById.get(unit.propertyId)?.name ?? "—",
      status: (unit.statusId ? statusById.get(unit.statusId) : undefined) ?? null,
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-medium tracking-tight">Units</h1>
        <PlanLimitGate resource="units">
          <Button onClick={openCreate}>
            <PlatformIcon icon="IconPlusSmall" size={16} data-icon="inline-start" />
            Add unit
          </Button>
        </PlanLimitGate>
      </div>

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
        <UnitsTable units={rows} onEdit={openEdit} />
      ) : (
        <div className="flex flex-col items-center gap-1 py-16 text-center">
          <p className="text-sm font-medium text-foreground">No units yet</p>
          <p className="text-sm text-muted-foreground">
            Create a unit under a property to track rent and availability.
          </p>
        </div>
      )}

      <UnitFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={editingUnit ? "edit" : "create"}
        unit={editingUnit}
      />
    </div>
  )
}
