"use client"

import {
  Button,
  createDataTableColumnHelper,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  PlatformIcon,
  TagBadge,
  type TagBadgeColor,
} from "@villuh/ui"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@villuh/server/router"

type RouterOutput = inferRouterOutputs<AppRouter>
/** Row shape from `tenants.list` — already includes current unit + tenancy status. */
export type TenantsTableRow = RouterOutput["tenants"]["list"]["tenants"][number]

/**
 * Tenancy status → badge presentation. Precedence (active > pending > ended) is
 * already applied server-side; `null` means the tenant has no tenancy at all and
 * renders as an em dash rather than a badge.
 */
const TENANCY_STATUS: Record<
  NonNullable<TenantsTableRow["tenancyStatus"]>,
  { label: string; color: TagBadgeColor }
> = {
  active: { label: "Active", color: "green" },
  pending: { label: "Pending", color: "amber" },
  ended: { label: "Ended", color: "slate" },
}

const columnHelper = createDataTableColumnHelper<TenantsTableRow>()

export function createTenantsColumns({
  onView,
  onEdit,
  onArchive,
}: {
  onView: (tenant: TenantsTableRow) => void
  onEdit: (tenant: TenantsTableRow) => void
  onArchive: (tenant: TenantsTableRow) => void
}) {
  return columnHelper.columns([
    columnHelper.accessor("lastName", {
      header: "Name",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onView(row.original)}
          className="font-medium text-foreground hover:underline"
        >
          {row.original.firstName} {row.original.lastName}
        </button>
      ),
    }),
    columnHelper.accessor("email", {
      header: "Email",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email}</span>
      ),
    }),
    columnHelper.accessor("phone", {
      header: "Phone",
      cell: ({ row }) => <>{row.original.phone ?? "—"}</>,
    }),
    columnHelper.accessor("currentUnit", {
      header: "Current unit",
      cell: ({ row }) => <>{row.original.currentUnit?.label ?? "Unassigned"}</>,
    }),
    columnHelper.accessor("tenancyStatus", {
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.tenancyStatus
        if (!status) return <>—</>
        const { label, color } = TENANCY_STATUS[status]
        return <TagBadge variant={color}>{label}</TagBadge>
      },
    }),
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      // Keep the actions column anchored as the last column.
      meta: { enableMoving: false },
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <PlatformIcon icon="IconDotGrid1x3Horizontal" size={16} />
                <span className="sr-only">Tenant actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onView(row.original)}>
                <PlatformIcon icon="IconEyeOpen" size={16} />
                View tenant
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEdit(row.original)}>
                <PlatformIcon icon="IconPencil" size={16} />
                Edit tenant
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => onArchive(row.original)}
              >
                <PlatformIcon icon="IconArchive" size={16} />
                Archive tenant
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    }),
  ])
}
