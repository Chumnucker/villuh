"use client"

import { Page } from "@villuh/ui"
import { PropertyDetailsCard } from "@/modules/properties/components/view/about/property-details-card"
import { PropertyAmenitiesCard } from "../../components/view/about/property-amenities-card"

export function PropertyAboutTemplate() {
  return (
    <Page.Content className="gap-8">
      <PropertyDetailsCard />
      <PropertyAmenitiesCard />
    </Page.Content>
  )
}
