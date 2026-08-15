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
import { createTenantsColumns } from "./columns"

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
   * When set, scopes the table to a single property: the server query is always
   * filtered to tenants whose current unit belongs to this property (can't be
   * changed) and the Unit filter chip is hidden (its options would span the
   * whole org, not just this property).
   */
  lockedPropertyId?: string
  /** Filters presentation for the toolbar — use "compact" in narrow layouts. */
  filterDisplay?: "inline" | "compact"
}

export function TenantsList({
  lockedUnitId,
  lockedPropertyId,
  filterDisplay,
}: TenantsListProps) {
  const { form, archive, detail } = tenantOverlays.useGroup()

  const isScoped = lockedUnitId !== undefined || lockedPropertyId !== undefined

  const { query, setQuery, serverInput, filterFields } = useDataTableQueryState(
    tenantsTable,
    {
      hide: isScoped ? HIDE_UNIT : HIDE_NOTHING,
    }
  )

  const { data, isLoading } = trpc.tenants.list.useQuery({
    ...serverInput,
    ...(lockedUnitId ? { unitIds: [lockedUnitId] } : {}),
    ...(lockedPropertyId ? { propertyIds: [lockedPropertyId] } : {}),
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
          <PlatformIcon
            icon="IconPlusSmall"
            size={16}
            data-icon="inline-start"
          />
          Add tenant
        </Button>
      }
      searchPlaceholder="Search tenants..."
      empty={{
        icon: "IconTeam",
        title: "No tenants yet",
        description: "Add a tenant, then assign them to a unit.",
        action: (
          <Button size="sm" onClick={() => form.open()}>
            <PlatformIcon
              icon="IconPlusSmall"
              size={16}
              data-icon="inline-start"
            />
            Add tenant
          </Button>
        ),
      }}
      emptyFiltered={{
        icon: "IconMagnifyingGlass",
        title: "No matching tenants",
        description: "Try adjusting your search or filters.",
      }}
    />
  )
}

export { createTenantsColumns, type TenantsTableRow } from "./columns"
