"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import { trpc } from "@villuh/api"
import {
  Page,
  PlatformIcon,
  SkeletonBox,
  SkeletonContainer,
} from "@villuh/ui"
import { TenantsList } from "@/modules/tenants/components/list"

export function PropertyTenantsTemplate() {
  const { propertyId } = useParams<{ propertyId: string }>()

  const { data, isLoading } = trpc.units.list.useQuery({
    propertyIds: [propertyId],
  })

  const unitIds = useMemo(
    () => data?.units.map((unit) => unit.id) ?? [],
    [data?.units],
  )

  if (isLoading) {
    return (
      <Page.Content>
        <SkeletonContainer>
          <SkeletonBox className="h-64 rounded-4xl" />
        </SkeletonContainer>
      </Page.Content>
    )
  }

  // No units means no unit to assign a tenant to — and an empty `unitIds` list
  // reads as "no filter" server-side, so we must not fall through to the table.
  if (unitIds.length === 0) {
    return (
      <Page.Content>
        <div className="flex flex-col items-center gap-1 py-16 text-center">
          <PlatformIcon
            icon="IconTeam"
            size={28}
            className="mb-1 text-muted-foreground"
          />
          <p className="text-sm font-medium text-foreground">No tenants yet</p>
          <p className="text-sm text-muted-foreground">
            Add a unit to this property, then assign a tenant to it.
          </p>
        </div>
      </Page.Content>
    )
  }

  return (
    <Page.Content>
      <TenantsList lockedUnitIds={unitIds} filterDisplay="compact" />
    </Page.Content>
  )
}
