"use client"

import { Page } from "@villuh/ui"
import { PropertyGalleryManager } from "@/modules/properties/components/settings/gallery"

export function PropertySettingsGalleryTemplate() {
  return (
    <Page.Content>
      <PropertyGalleryManager />
    </Page.Content>
  )
}
