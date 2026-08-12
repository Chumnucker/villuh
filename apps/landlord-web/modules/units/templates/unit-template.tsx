"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { trpc } from "@villuh/api"
import { Button, Page, PlatformIcon, Skeleton, useLayout } from "@villuh/ui"
import { ROUTES } from "@/app/routes"
import { ArchiveUnitDialog } from "@/modules/units/components/archive-unit-dialog"
import { UnitFormSheet } from "@/modules/units/components/form/unit-form-sheet"
import { StatusBadge } from "@/modules/units/components/statuses/status-badge"
import { UnitDetailTabs } from "@/modules/units/components/unit/unit-detail-tabs"

export function UnitTemplate() {
  const { unitId } = useParams<{ unitId: string }>()
  const { setBreadcrumbs } = useLayout()
  const [editOpen, setEditOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

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
      <Page.Shell>
        <Page.Header>
          <Skeleton className="h-9 w-64" />
        </Page.Header>
        <Page.Content>
          <Skeleton className="h-64 rounded-4xl" />
        </Page.Content>
      </Page.Shell>
    )
  }

  const { unit } = data
  const property = propertiesData?.properties.find(
    (p) => p.id === unit.propertyId
  )
  const status =
    (unit.statusId
      ? statusesData?.statuses.find((s) => s.id === unit.statusId)
      : undefined) ?? null

  return (
    <Page.Shell>
      <Page.Header>
        <Page.Title>{unit.label}</Page.Title>
        {property ? (
          <Page.Description>
            <Link
              href={ROUTES.propertyDetail(property.id)}
              className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline"
            >
              <PlatformIcon icon="IconBuildings" size={14} />
              {property.name}
            </Link>
          </Page.Description>
        ) : null}
        <Page.Actions>
          <StatusBadge status={status} />
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            Edit unit
          </Button>
          <Button
            variant="ghost-destructive"
            onClick={() => setArchiveOpen(true)}
          >
            Archive unit
          </Button>
        </Page.Actions>
      </Page.Header>

      <Page.Content>
        <UnitDetailTabs unit={unit} property={property} status={status} />
      </Page.Content>

      <UnitFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        unit={unit}
      />
      <ArchiveUnitDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        unitId={unit.id}
        unitLabel={unit.label}
        propertyId={property?.id}
      />
    </Page.Shell>
  )
}
