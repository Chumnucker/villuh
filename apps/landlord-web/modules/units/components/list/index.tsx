"use client"

import { useMemo, useState } from "react"
import { trpc } from "@villuh/api"
import {
  Button,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  PlatformIcon,
  useDataTableQuery,
} from "@villuh/ui"
import { PlanLimitGate } from "@/modules/app/components/plan-limit/plan-limit-gate"
import { useUser } from "@/modules/app/providers/me-provider"
import { ArchiveUnitDialog } from "@/modules/units/components/archive-unit-dialog"
import { UnitFormSheet } from "@/modules/units/components/form/unit-form-sheet"
import { ManageUnitStatusesDialog } from "@/modules/units/components/statuses/manage-unit-statuses-dialog"
import { createUnitsColumns, type UnitsTableRow } from "./units-columns"
import { createUnitsFilterFields } from "./units-filters"

export type UnitsListProps = {
  /**
   * When set, scopes the table to a single property: the server query is
   * always filtered to this property (can't be changed), the redundant
   * Property filter chip + column are hidden, and create/archive stay
   * anchored to this property.
   */
  lockedPropertyId?: string
  /** Filters presentation for the toolbar — use "compact" in narrow layouts. */
  filterDisplay?: "inline" | "compact"
}

export function UnitsList({ lockedPropertyId, filterDisplay }: UnitsListProps) {
  const { user } = useUser()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<UnitsTableRow | undefined>(
    undefined
  )
  const [archivingUnit, setArchivingUnit] = useState<UnitsTableRow | undefined>(
    undefined
  )
  const [statusesOpen, setStatusesOpen] = useState(false)

  const { data: propertiesData } = trpc.properties.list.useQuery(undefined, {
    enabled: !lockedPropertyId,
  })
  const { data: statusesData } = trpc.unitStatuses.list.useQuery()

  const filterFields = useMemo(
    () =>
      createUnitsFilterFields(
        lockedPropertyId ? undefined : propertiesData?.properties,
        statusesData?.statuses
      ),
    [lockedPropertyId, propertiesData?.properties, statusesData?.statuses]
  )

  const { query, setQuery, serverInput } = useDataTableQuery(filterFields)
  const { data, isLoading } = trpc.units.list.useQuery({
    ...serverInput,
    ...(lockedPropertyId ? { propertyIds: [lockedPropertyId] } : {}),
  })

  const columns = useMemo(
    () =>
      createUnitsColumns({
        onEdit: (unit) => {
          setEditingUnit(unit)
          setSheetOpen(true)
        },
        onArchive: setArchivingUnit,
        hidePropertyColumn: Boolean(lockedPropertyId),
      }),
    [lockedPropertyId]
  )

  // Org-wide statuses are only reachable from the global list — inside a
  // property they'd read as property-scoped settings, which they aren't.
  const showStatusesMenu = !lockedPropertyId && user.org.permissions.admin

  return (
    <>
      <DataTable
        columns={columns}
        data={data?.units}
        total={data?.total}
        isLoading={isLoading}
        query={query}
        onQueryChange={setQuery}
        filterFields={filterFields}
        filterDisplay={filterDisplay}
        toolbarAction={
          <div className="flex items-center gap-2">
            <PlanLimitGate resource="units" action="Adding a unit">
              <Button
                size="sm"
                onClick={() => {
                  setEditingUnit(undefined)
                  setSheetOpen(true)
                }}
              >
                <PlatformIcon
                  icon="IconPlusSmall"
                  size={16}
                  data-icon="inline-start"
                />
                Add unit
              </Button>
            </PlanLimitGate>
            {showStatusesMenu ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon-sm">
                    <PlatformIcon icon="IconDotGrid1x3Horizontal" size={16} />
                    <span className="sr-only">Units options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setStatusesOpen(true)}>
                    <PlatformIcon icon="IconCircleCheck" size={16} />
                    Manage statuses
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        }
        searchPlaceholder="Search units..."
        empty={{
          title: "No units yet",
          description:
            "Create a unit under a property to track rent and availability.",
        }}
        emptyFiltered={{
          title: "No matching units",
          description: "Try adjusting your search or filters.",
        }}
      />

      <UnitFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={editingUnit ? "edit" : "create"}
        unit={editingUnit}
        // Only lock the property on create — editing keeps the freedom to
        // reassign a unit to a different property.
        lockedPropertyId={editingUnit ? undefined : lockedPropertyId}
      />
      <ArchiveUnitDialog
        open={Boolean(archivingUnit)}
        onOpenChange={(open) => {
          if (!open) setArchivingUnit(undefined)
        }}
        unitId={archivingUnit?.id ?? ""}
        unitLabel={archivingUnit?.label ?? ""}
        // Redirect back to the parent property when the list is scoped to one.
        propertyId={lockedPropertyId}
      />
      <ManageUnitStatusesDialog
        open={statusesOpen}
        onOpenChange={setStatusesOpen}
      />
    </>
  )
}

export { createUnitsColumns, type UnitsTableRow } from "./units-columns"
export { createUnitsFilterFields } from "./units-filters"
