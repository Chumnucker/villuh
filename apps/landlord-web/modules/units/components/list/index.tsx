"use client"

import { useMemo } from "react"
import { trpc } from "@villuh/api"
import { DataTable, useDataTableQuery } from "@villuh/ui"
import { createUnitsColumns, type UnitsTableRow } from "./units-columns"
import { createUnitsFilterFields } from "./units-filters"

export type UnitsListProps = {
  onEdit: (unit: UnitsTableRow) => void
  onArchive: (unit: UnitsTableRow) => void
  /**
   * When set, scopes the table to a single property: the server query is
   * always filtered to this property (can't be changed), and the redundant
   * Property filter chip + column are hidden.
   */
  lockedPropertyId?: string
  /** Filters presentation for the toolbar — use "compact" in narrow layouts. */
  filterDisplay?: "inline" | "compact"
  /** Rendered pinned to the right of the toolbar (e.g. an "Add unit" button). */
  toolbarAction?: React.ReactNode
}

export function UnitsList({
  onEdit,
  onArchive,
  lockedPropertyId,
  filterDisplay,
  toolbarAction,
}: UnitsListProps) {
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
        onEdit,
        onArchive,
        hidePropertyColumn: Boolean(lockedPropertyId),
      }),
    [onEdit, onArchive, lockedPropertyId]
  )

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
      toolbarAction={toolbarAction}
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
export { createUnitsFilterFields } from "./units-filters"
