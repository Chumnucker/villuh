"use client"

import Link from "next/link"
import {
  Badge,
  EmptyState,
  OverlayBody,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type StatusBadgeStatus,
} from "@villuh/ui"
import { trpc } from "@villuh/api"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@villuh/server/router"
import { ROUTES } from "@/app/routes"

type RouterOutput = inferRouterOutputs<AppRouter>
type UnitTenancy = RouterOutput["tenants"]["unitTenancyHistory"][number]

/** Tenancy enum status → a soft status badge (mirrors the tenant detail sheet). */
const TENANCY_STATUS_BADGE: Record<UnitTenancy["status"], StatusBadgeStatus> = {
  active: { name: "Active", colorKey: "green", iconKey: "" },
  pending: { name: "Pending", colorKey: "amber", iconKey: "" },
  ended: { name: "Ended", colorKey: "slate", iconKey: "" },
}

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
 * Screen 6 body tabs. Tenant history renders this unit's full tenancy history —
 * current active occupant first, then ended tenancies (UNIT-04) — via the
 * unit-scoped `unitTenancyHistory` read (which INCLUDES archived/ended rows, unlike
 * the current-only tenant list). Rent history remains stub-empty (UNIT-03, D-04) —
 * no ledger API calls, no fabricated rows; live wiring is a future phase.
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
        <TenantHistoryTab unitId={unit.id} />
      </TabsContent>
    </Tabs>
  )
}

/**
 * Compact chronological tenant history for a unit: active occupant first, then
 * ended tenancies. Each row lists its members (primary marked) and date range.
 */
function TenantHistoryTab({ unitId }: { unitId: string }) {
  const historyQuery = trpc.tenants.unitTenancyHistory.useQuery({ unitId })

  return (
    <OverlayBody query={historyQuery} pending={<HistorySkeleton />}>
      {(tenancies) =>
        tenancies.length === 0 ? (
          <EmptyState
            icon="IconHomeDoor"
            title="No tenants yet"
            description="Assign a tenant to this unit to start its history."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {tenancies.map((tenancy) => (
              <li
                key={tenancy.id}
                className="flex flex-col gap-2 rounded-2xl border border-border p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={TENANCY_STATUS_BADGE[tenancy.status] ?? null} />
                  <span className="text-xs text-muted-foreground">
                    {tenancy.startDate ?? "—"} → {tenancy.endDate ?? "Ongoing"}
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {tenancy.members.map((member) => (
                    <li
                      key={member.tenantId}
                      className="flex items-center gap-2 text-sm text-foreground"
                    >
                      <span>
                        {member.firstName} {member.lastName}
                      </span>
                      {member.isPrimary ? (
                        <Badge variant="secondary">Primary</Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )
      }
    </OverlayBody>
  )
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-24 rounded-2xl border border-border" />
      ))}
    </div>
  )
}
