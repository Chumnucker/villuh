"use client"

import Link from "next/link"
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  PlatformIcon,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@villuh/ui"
import { ROUTES } from "@/app/routes"
import { StatusBadge, type StatusBadgeStatus } from "@/modules/units/components/statuses/status-badge"

export type UnitsTableRow = {
  id: string
  label: string
  squareFootage: number | null
  baseRent: number
  propertyId: string
  propertyName: string
  status: StatusBadgeStatus | null
}

/** Screen 4 `/units` list table — denser than the property card grid (UI-SPEC). */
export function UnitsTable({
  units,
  onEdit,
  onArchive,
}: {
  units: UnitsTableRow[]
  onEdit: (unitId: string) => void
  onArchive: (unitId: string) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Unit</TableHead>
          <TableHead>Property</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Base rent</TableHead>
          <TableHead>Sq ft</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {units.map((unit) => (
          <TableRow key={unit.id}>
            <TableCell>
              <Link href={ROUTES.unitDetail(unit.id)} className="font-medium text-foreground hover:underline">
                {unit.label}
              </Link>
            </TableCell>
            <TableCell>
              <Link
                href={ROUTES.propertyDetail(unit.propertyId)}
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                {unit.propertyName}
              </Link>
            </TableCell>
            <TableCell>
              <StatusBadge status={unit.status} />
            </TableCell>
            <TableCell>${(unit.baseRent / 100).toLocaleString()}</TableCell>
            <TableCell>{unit.squareFootage ?? "—"}</TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <PlatformIcon icon="IconDotGrid1x3Horizontal" size={16} />
                    <span className="sr-only">Unit actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onEdit(unit.id)}>
                    <PlatformIcon icon="IconPencil" size={16} />
                    Edit unit
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={() => onArchive(unit.id)}>
                    <PlatformIcon icon="IconArchive" size={16} />
                    Archive unit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
