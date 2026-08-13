"use client"

import { useMemo } from "react"
import { trpc } from "@villuh/api"
import {
  Button,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  PlatformIcon,
  useDataTableQueryState,
} from "@villuh/ui"
import { PlanLimitGate } from "@/modules/app/components/plan-limit/plan-limit-gate"
import { useUser } from "@/modules/app/providers/me-provider"
import { unitOverlays } from "@/modules/units/lib/units.overlays"
import { unitsTable } from "@/modules/units/lib/units.table"
import { createUnitsColumns } from "./units-columns"

// Module scope so the array identity is stable across renders.
const HIDE_PROPERTY = ["property"] as const
const HIDE_NOTHING = [] as const

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
  const { form, archive, statuses } = unitOverlays.useGroup()

  const { query, setQuery, serverInput, filterFields } =
    useDataTableQueryState(unitsTable, {
      hide: lockedPropertyId ? HIDE_PROPERTY : HIDE_NOTHING,
    })

  const { data, isLoading } = trpc.units.list.useQuery({
    ...serverInput,
    ...(lockedPropertyId ? { propertyIds: [lockedPropertyId] } : {}),
  })

  const columns = useMemo(
    () =>
      createUnitsColumns({
        onEdit: (unit) => form.open(unit.id),
        onArchive: (unit) => archive.open(unit.id),
        hidePropertyColumn: Boolean(lockedPropertyId),
      }),
    [lockedPropertyId, form.open, archive.open]
  )

  // Org-wide statuses are only reachable from the global list — inside a
  // property they'd read as property-scoped settings, which they aren't.
  const showStatusesMenu = !lockedPropertyId && user.org.permissions.admin

  return (
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
            <Button size="sm" onClick={() => form.open()}>
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
                <DropdownMenuItem onSelect={() => statuses.open()}>
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
  )
}

export { createUnitsColumns, type UnitsTableRow } from "./units-columns"
