"use client"

import { PropertyTabsNav } from "@/modules/properties/components/property-tabs-nav"
import { PROPERTY_SETTINGS_TAB_GROUP } from "@/modules/properties/lib/property-tab-groups"

/** Tab bar for the property settings nested layout — General, Units, … */
export function PropertySettingsTabsNav({
  propertyId,
}: {
  propertyId: string
}) {
  return (
    <PropertyTabsNav
      group={PROPERTY_SETTINGS_TAB_GROUP}
      propertyId={propertyId}
    />
  )
}
