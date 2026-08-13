"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { trpc } from "@villuh/api"
import {
  Button,
  Page,
  PlatformIcon,
  SkeletonBox,
  SkeletonContainer,
  SkeletonLabel,
  StatusBadge,
  useBreadcrumbLabel,
} from "@villuh/ui"
import { ROUTES } from "@/app/routes"
import { unitOverlays } from "@/modules/units/lib/units.overlays"
import { UnitDetailTabs } from "@/modules/units/components/unit/unit-detail-tabs"

export function UnitTemplate() {
  const { unitId } = useParams<{ unitId: string }>()
  const { form, archive } = unitOverlays.useGroup()

  const unitQuery = trpc.units.get.useQuery({ unitId })

  useBreadcrumbLabel(unitId, unitQuery.data?.unit.label)

  return (
    <Page.Shell>
      <Page.Boundary
        query={unitQuery}
        pending={
          <SkeletonContainer className="flex-col gap-4">
            <Page.Header>
              <SkeletonLabel className="h-9 w-64" />
            </Page.Header>
            <Page.Content>
              <SkeletonBox className="h-64 rounded-4xl" />
            </Page.Content>
          </SkeletonContainer>
        }
      >
        {({ unit, property, status }) => (
          <>
              <Page.Header>
                <Page.Title>{unit.label}</Page.Title>
                <Page.Description>
                  <Link
                    href={ROUTES.propertyDetail(property.id)}
                    className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline"
                  >
                    <PlatformIcon icon="IconBuildings" size={14} />
                    {property.name}
                  </Link>
                </Page.Description>
                <Page.Actions>
                  <StatusBadge status={status} />
                  <Button variant="outline" onClick={() => form.open(unit.id)}>
                    Edit unit
                  </Button>
                  <Button
                    variant="ghost-destructive"
                    onClick={() => archive.open(unit.id)}
                  >
                    Archive unit
                  </Button>
                </Page.Actions>
              </Page.Header>

              <Page.Content>
                <UnitDetailTabs unit={unit} property={property} status={status} />
              </Page.Content>
            </>
        )}
      </Page.Boundary>
    </Page.Shell>
  )
}
