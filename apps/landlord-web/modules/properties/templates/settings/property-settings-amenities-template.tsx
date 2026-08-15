"use client"

import { Page } from "@villuh/ui"
import { PropertyAmenitiesSection } from "@/modules/properties/components/settings/amenities"

export function PropertySettingsAmenitiesTemplate() {
  return (
    <Page.Content className="gap-6">
      <PropertyAmenitiesSection />
    </Page.Content>
  )
}
