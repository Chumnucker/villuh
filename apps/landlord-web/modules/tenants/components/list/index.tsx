"use client"

import { useMemo } from "react"
import { trpc } from "@villuh/api"
import {
  Button,
  DataTable,
  PlatformIcon,
  useDataTableQueryState,
} from "@villuh/ui"
import { tenantOverlays } from "@/modules/tenants/lib/tenants.overlays"
import { tenantsTable } from "@/modules/tenants/lib/tenants.table"
import { createTenantsColumns } from "./tenants-columns"

// Module scope so the array identity is stable across renders.
const HIDE_UNIT = ["unit"] as const
const HIDE_NOTHING = [] as const

export type TenantsListProps = {
  /**
   * When set, scopes the table to a single unit: the server query is always
   * filtered to this unit (can't be changed) and the redundant Unit filter chip
   * is hidden.
   */
  lockedUnitId?: string
  /**
   * Multi-unit generalization of `lockedUnitId`: scopes the table to a set of
   * units (e.g. every unit in a property). The server query is always filtered
   * to these units and the redundant Unit filter chip is hidden. When both are
   * provided, `lockedUnitId` wins.
   */
  lockedUnitIds?: string[]
  /** Filters presentation for the toolbar — use "compact" in narrow layouts. */
  filterDisplay?: "inline" | "compact"
}

export function TenantsList({
  lockedUnitId,
  lockedUnitIds,
  filterDisplay,
}: TenantsListProps) {
  const { form, archive, detail } = tenantOverlays.useGroup()

  const lockedUnits = lockedUnitId ? [lockedUnitId] : lockedUnitIds
  const isUnitLocked = lockedUnits !== undefined

  const { query, setQuery, serverInput, filterFields } =
    useDataTableQueryState(tenantsTable, {
      hide: isUnitLocked ? HIDE_UNIT : HIDE_NOTHING,
    })

  const { data, isLoading } = trpc.tenants.list.useQuery({
    ...serverInput,
    ...(lockedUnits ? { unitIds: lockedUnits } : {}),
  })

  const columns = useMemo(
    () =>
      createTenantsColumns({
        onView: (tenant) => detail.open(tenant.id),
        onEdit: (tenant) => form.open(tenant.id),
        onArchive: (tenant) => archive.open(tenant.id),
      }),
    [detail.open, form.open, archive.open]
  )

  return (
    <DataTable
      columns={columns}
      data={data?.tenants}
      total={data?.total}
      isLoading={isLoading}
      query={query}
      onQueryChange={setQuery}
      filterFields={filterFields}
      filterDisplay={filterDisplay}
      toolbarAction={
        <Button size="sm" onClick={() => form.open()}>
          <PlatformIcon icon="IconPlusSmall" size={16} data-icon="inline-start" />
          Add tenant
        </Button>
      }
      searchPlaceholder="Search tenants..."
      empty={{
        title: "No tenants yet",
        description: "Add a tenant, then assign them to a unit.",
      }}
      emptyFiltered={{
        title: "No matching tenants",
        description: "Try adjusting your search or filters.",
      }}
    />
  )
}

export { createTenantsColumns, type TenantsTableRow } from "./tenants-columns"
