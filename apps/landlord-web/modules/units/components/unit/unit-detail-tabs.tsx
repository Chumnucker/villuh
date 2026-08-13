"use client"

import Link from "next/link"
import {
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type StatusBadgeStatus,
} from "@villuh/ui"
import { ROUTES } from "@/app/routes"
import { TenantsList } from "@/modules/tenants/components/list"

export type UnitDetailOverview = {
  id: string
  label: string
  squareFootage: number | null
  baseRent: number
}

function OverviewField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-sm font-medium text-foreground">{children}</div>
    </div>
  )
}

/**
 * Screen 6 body tabs. Tenant history renders this unit's tenancies via the live
 * TenantsList (scoped to the unit). Rent history remains stub-empty (UNIT-03,
 * D-04) — no ledger API calls, no fabricated rows; live wiring is a future phase.
 */
export function UnitDetailTabs({
  unit,
  property,
  status,
}: {
  unit: UnitDetailOverview
  property?: { id: string; name: string }
  status: StatusBadgeStatus | null
}) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="rent-history">Rent history</TabsTrigger>
        <TabsTrigger value="tenant-history">Tenant history</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="grid gap-4 sm:grid-cols-2">
          <OverviewField label="Unit label">{unit.label}</OverviewField>
          <OverviewField label="Property">
            {property ? (
              <Link href={ROUTES.propertyDetail(property.id)} className="hover:underline">
                {property.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </OverviewField>
          <OverviewField label="Square footage">{unit.squareFootage ?? "—"}</OverviewField>
          <OverviewField label="Base rent">${(unit.baseRent / 100).toLocaleString()}</OverviewField>
          <OverviewField label="Status">
            <StatusBadge status={status} />
          </OverviewField>
        </div>
      </TabsContent>

      <TabsContent value="rent-history">
        <div className="flex flex-col items-center gap-1 py-12 text-center">
          <p className="text-sm font-medium text-foreground">Rent history coming soon</p>
          <p className="text-sm text-muted-foreground">
            Payment history for this unit will appear here once rent tracking is available.
          </p>
        </div>
      </TabsContent>

      <TabsContent value="tenant-history">
        <TenantsList lockedUnitId={unit.id} filterDisplay="compact" />
      </TabsContent>
    </Tabs>
  )
}
