"use client"

import { useParams } from "next/navigation"
import { Page } from "@villuh/ui"
import { TenantsList } from "@/modules/tenants/components/list"

export function PropertyTenantsTemplate() {
  const { propertyId } = useParams<{ propertyId: string }>()

  return (
    <Page.Content>
      <TenantsList lockedPropertyId={propertyId} filterDisplay="compact" />
    </Page.Content>
  )
}
