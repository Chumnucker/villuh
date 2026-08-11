"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { trpc } from "@villuh/api"
import { Button, PlatformIcon, Skeleton, useLayout } from "@villuh/ui"
import { ROUTES } from "@/app/routes"
import { StatusBadge } from "@/modules/app/components/units/status-badge"
import { UnitDetailTabs } from "@/modules/app/components/units/unit-detail-tabs"
import { UnitFormSheet } from "@/modules/app/components/units/unit-form-sheet"

export default function UnitDetailPage() {
  const { unitId } = useParams<{ unitId: string }>()
  const { setBreadcrumbs } = useLayout()
  const [editOpen, setEditOpen] = useState(false)

  const { data, isLoading } = trpc.units.get.useQuery({ unitId })
  const { data: propertiesData } = trpc.properties.list.useQuery()
  const { data: statusesData } = trpc.unitStatuses.list.useQuery()

  useEffect(() => {
    if (!data) return
    setBreadcrumbs((prev) => ({
      values: { ...prev.values, [unitId]: data.unit.label },
    }))
  }, [data, unitId, setBreadcrumbs])

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 rounded-4xl" />
      </div>
    )
  }

  const { unit } = data
  const property = propertiesData?.properties.find((p) => p.id === unit.propertyId)
  const status = (unit.statusId ? statusesData?.statuses.find((s) => s.id === unit.statusId) : undefined) ?? null

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-medium tracking-tight">{unit.label}</h1>
            <StatusBadge status={status} />
          </div>
          {property ? (
            <Link
              href={ROUTES.propertyDetail(property.id)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              <PlatformIcon icon="IconBuildings" size={14} />
              {property.name}
            </Link>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            Edit unit
          </Button>
          {/* Plan 08 wires the confirm dialog onto this trigger. */}
          <Button variant="ghost-destructive" onClick={() => undefined}>
            Archive unit
          </Button>
        </div>
      </div>

      <UnitDetailTabs unit={unit} property={property} status={status} />

      <UnitFormSheet open={editOpen} onOpenChange={setEditOpen} mode="edit" unit={unit} />
    </div>
  )
}
