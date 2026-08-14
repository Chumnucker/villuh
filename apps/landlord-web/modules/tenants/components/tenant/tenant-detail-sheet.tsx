"use client"

import Link from "next/link"
import {
  Badge,
  EmptyState,
  OverlayBody,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SkeletonBox,
  SkeletonLabel,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type EntityOverlayHandle,
  type StatusBadgeStatus,
} from "@villuh/ui"
import { trpc } from "@villuh/api"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@villuh/server/router"
import { ROUTES } from "@/app/routes"

type RouterOutput = inferRouterOutputs<AppRouter>
type TenantDetail = RouterOutput["tenants"]["get"]
type TenancyDetail = TenantDetail["tenancies"][number]
type ActivityEntry = RouterOutput["tenants"]["activity"]["entries"][number]

/**
 * Read-only tenant detail Sheet, opened from a `?tenant.detail={id}` overlay.
 * Cold-loads from a pasted URL: the tenant is fetched by id (gated on open) and
 * activity is a separate paginated read. Mirrors the loading/empty treatment of
 * `unit-detail-tabs.tsx`.
 */
export function TenantDetailSheet({ overlay }: { overlay: EntityOverlayHandle }) {
  // `heldEntityId` keeps the tenant resolved through the close animation
  // (`entityId` is null by then, which would blank the body mid-close). Query
  // stays gated on `isOpen` so it never fires while closed.
  const tenantId = overlay.heldEntityId

  const tenantQuery = trpc.tenants.get.useQuery(
    { tenantId: tenantId ?? "" },
    { enabled: overlay.isOpen && tenantId !== null }
  )

  return (
    <Sheet {...overlay.dialogProps}>
      <SheetContent className="gap-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Tenant details</SheetTitle>
          <SheetDescription className="sr-only">
            Profile, tenancies and activity for this tenant.
          </SheetDescription>
        </SheetHeader>
        {tenantId === null ? null : (
          <OverlayBody query={tenantQuery} pending={<DetailSkeleton />}>
            {(data) => <DetailBody data={data} tenantId={tenantId} />}
          </OverlayBody>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
      <SkeletonLabel className="h-6 w-40" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <SkeletonLabel className="h-4 w-24" />
          <SkeletonBox className="h-5 w-full rounded-md" />
        </div>
      ))}
    </div>
  )
}

function DetailBody({ data, tenantId }: { data: TenantDetail; tenantId: string }) {
  const { tenant, tenancies } = data
  const activityQuery = trpc.tenants.activity.useQuery({ tenantId })

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
      <div>
        <h2 className="font-heading text-lg font-medium text-foreground">
          {tenant.firstName} {tenant.lastName}
        </h2>
        <p className="text-sm text-muted-foreground">{tenant.email}</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="tenancies">Tenancies</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              {tenant.firstName} {tenant.lastName}
            </Field>
            <Field label="Email">{tenant.email}</Field>
            <Field label="Phone">{tenant.phone ?? "—"}</Field>
            <Field label="Notes" className="sm:col-span-2">
              {tenant.notes ? (
                <span className="whitespace-pre-wrap">{tenant.notes}</span>
              ) : (
                "—"
              )}
            </Field>
          </div>
        </TabsContent>

        <TabsContent value="tenancies">
          {tenancies.length === 0 ? (
            <EmptyState
              icon="IconHomeDoor"
              title="No tenancies"
              description="This tenant is not attached to any unit yet."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {tenancies.map((tenancy) => (
                <TenancyCard key={tenancy.id} tenancy={tenancy} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity">
          <OverlayBody query={activityQuery} pending={<ActivitySkeleton />}>
            {({ entries }) =>
              entries.length === 0 ? (
                <EmptyState
                  icon="IconCalendar"
                  title="No activity"
                  description="Changes to this tenant will appear here."
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {entries.map((entry) => (
                    <li key={entry.id} className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">
                        {describeEntry(entry)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(entry.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            }
          </OverlayBody>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-sm font-medium text-foreground">{children}</div>
    </div>
  )
}

/** Tenancy enum status → a soft status badge (no server-driven status object here). */
const TENANCY_STATUS_BADGE: Record<TenancyDetail["status"], StatusBadgeStatus> = {
  active: { name: "Active", colorKey: "green", iconKey: "" },
  pending: { name: "Pending", colorKey: "amber", iconKey: "" },
  ended: { name: "Ended", colorKey: "slate", iconKey: "" },
}

function TenancyCard({ tenancy }: { tenancy: TenancyDetail }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={ROUTES.unitDetail(tenancy.unit.id)}
          className="text-sm font-medium text-foreground hover:underline"
        >
          {tenancy.unit.label}
        </Link>
        <StatusBadge status={TENANCY_STATUS_BADGE[tenancy.status] ?? null} />
      </div>

      <div className="text-xs text-muted-foreground">
        {tenancy.startDate ?? "—"} → {tenancy.endDate ?? "Ongoing"}
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
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1">
          <SkeletonLabel className="h-4 w-40" />
          <SkeletonLabel className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

/**
 * Human line for an audit_log entry. Keyed by `table_name/operation`; unknown
 * pairs fall back to a readable default so future tables surface without a code
 * change (the timeline is deliberately open-ended — see the server read).
 */
function describeEntry(entry: ActivityEntry): string {
  const key = `${entry.tableName}/${entry.operation}`
  switch (key) {
    case "tenants/INSERT":
      return "Tenant profile created"
    case "tenants/UPDATE":
      return "Tenant profile updated"
    case "tenancies/INSERT":
      return "Tenancy created"
    case "tenancies/UPDATE":
      return "Tenancy updated"
    case "tenancies/DELETE":
      return "Tenancy removed"
    case "tenancy_members/INSERT":
      return "Added to a tenancy"
    case "tenancy_members/DELETE":
      return "Removed from a tenancy"
    default:
      return `${entry.tableName} ${entry.operation.toLowerCase()}`
  }
}

const RELATIVE_UNITS: Array<{ limit: number; div: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { limit: 60, div: 1, unit: "second" },
  { limit: 3600, div: 60, unit: "minute" },
  { limit: 86400, div: 3600, unit: "hour" },
  { limit: 604800, div: 86400, unit: "day" },
  { limit: 2629800, div: 604800, unit: "week" },
  { limit: 31557600, div: 2629800, unit: "month" },
  { limit: Infinity, div: 31557600, unit: "year" },
]

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })

/**
 * `createdAt` arrives as a runtime `Date` from Postgres (even though the server
 * type annotates it as `string`), so we normalise through `new Date(...)` which
 * accepts both a `Date` and an ISO string. Guards a bad/absent value.
 */
function formatRelativeTime(value: string | Date): string {
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return ""
  const diffSeconds = (then - Date.now()) / 1000
  const abs = Math.abs(diffSeconds)
  for (const { limit, div, unit } of RELATIVE_UNITS) {
    if (abs < limit) return rtf.format(Math.round(diffSeconds / div), unit)
  }
  return ""
}
