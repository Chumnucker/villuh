"use client"

import { useState } from "react"
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PlatformIcon,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@villuh/ui"
import { PlanLimitGate } from "@/modules/app/components/plan-limit/plan-limit-gate"
import { UnitFormSheet } from "@/modules/app/components/units/unit-form-sheet"

export type PropertyUnitRow = {
  id: string
  label: string
  squareFootage: number | null
  baseRent: number
}

/**
 * Nested units list on the property detail page. Add unit opens the shared `UnitFormSheet`
 * locked + prefilled to `propertyId` (D-10) — same Sheet used by the global `/units` list.
 */
export function PropertyUnitsSection({
  propertyId,
  units,
}: {
  propertyId: string
  units: PropertyUnitRow[]
}) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Units</CardTitle>
        <PlanLimitGate resource="units" action="Adding a unit">
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <PlatformIcon icon="IconPlusSmall" size={16} data-icon="inline-start" />
            Add unit
          </Button>
        </PlanLimitGate>
      </CardHeader>
      <CardContent>
        {units.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-12 text-center">
            <p className="text-sm font-medium text-foreground">No units in this property</p>
            <p className="text-sm text-muted-foreground">
              Add a unit to assign tenants and leases later.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Sq ft</TableHead>
                <TableHead>Base rent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell>{unit.label}</TableCell>
                  <TableCell>{unit.squareFootage ?? "—"}</TableCell>
                  <TableCell>${(unit.baseRent / 100).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <UnitFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode="create"
        lockedPropertyId={propertyId}
      />
    </Card>
  )
}
