"use client"

import { useParams } from "next/navigation"
import { Page } from "@villuh/ui"
import { UnitsList } from "@/modules/units/components/list"

export function PropertyUnitsTemplate() {
  const { propertyId } = useParams<{ propertyId: string }>()

  return (
    <Page.Content>
      <UnitsList lockedPropertyId={propertyId} filterDisplay="compact" />
    </Page.Content>
  )
}
