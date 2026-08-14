"use client"

import Link from "next/link"
import {
  Button,
  createDataTableColumnHelper,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  PlatformIcon,
  StatusBadge,
} from "@villuh/ui"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@villuh/server/router"
import { ROUTES } from "@/app/routes"
import {
  AmenityChipRow,
  type AmenityChip,
} from "@/modules/amenities/components/amenity-chip-row"

type RouterOutput = inferRouterOutputs<AppRouter>
/** Row shape from `units.list` — already includes property + status. */
export type UnitsTableRow = RouterOutput["units"]["list"]["units"][number]

const columnHelper = createDataTableColumnHelper<UnitsTableRow>()

export function createUnitsColumns({
  onEdit,
  onArchive,
  hidePropertyColumn = false,
  amenitiesByUnit,
}: {
  onEdit: (unit: UnitsTableRow) => void
  onArchive: (unit: UnitsTableRow) => void
  /** Drop the redundant Property column when the table is already scoped to one property. */
  hidePropertyColumn?: boolean
  /**
   * Per-unit amenity chips, keyed by unit id — built once per page from
   * `amenities.unit.listByProperty` (D-33, no query per row). Absent while the
   * map is still loading; the column then renders an em-dash placeholder.
   */
  amenitiesByUnit?: Record<string, AmenityChip[]>
}) {
  return columnHelper.columns([
    columnHelper.accessor("label", {
      header: "Unit",
      cell: ({ row }) => (
        <Link
          href={ROUTES.unitDetail(row.original.id)}
          className="font-medium text-foreground hover:underline"
        >
          {row.original.label}
        </Link>
      ),
    }),
    ...(hidePropertyColumn
      ? []
      : [
          columnHelper.accessor("propertyName", {
            header: "Property",
            cell: ({ row }) => (
              <Link
                href={ROUTES.propertyDetail(row.original.propertyId)}
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                {row.original.propertyName}
              </Link>
            ),
          }),
        ]),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    }),
    columnHelper.accessor("baseRent", {
      header: "Base rent",
      cell: ({ row }) => (
        <>${(row.original.baseRent / 100).toLocaleString()}</>
      ),
    }),
    columnHelper.accessor("squareFootage", {
      header: "Sq ft",
      cell: ({ row }) => <>{row.original.squareFootage ?? "—"}</>,
    }),
    columnHelper.display({
      id: "amenities",
      header: "Amenities",
      // Amenity assignment has no server sort key; it renders the chip-overflow
      // row fed by the per-page listByProperty map.
      enableSorting: false,
      cell: ({ row }) => {
        const chips = amenitiesByUnit?.[row.original.id] ?? []
        return chips.length > 0 ? (
          <AmenityChipRow amenities={chips} max={3} />
        ) : (
          <span className="text-muted-foreground">—</span>
        )
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
                <span className="sr-only">Unit actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(row.original)}>
                <PlatformIcon icon="IconPencil" size={16} />
                Edit unit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => onArchive(row.original)}
              >
                <PlatformIcon icon="IconArchive" size={16} />
                Archive unit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    }),
  ])
}
