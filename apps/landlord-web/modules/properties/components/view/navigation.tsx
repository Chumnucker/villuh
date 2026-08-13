"use client"

import { PropertyTabsNav as TabsNav } from "@/modules/properties/components/property-tabs-nav"
import { PROPERTY_DETAIL_TAB_GROUP } from "@/modules/properties/lib/property-tab-groups"

/** Tab bar for the property detail nested layout — About, Units, Gallery, … */
export function PropertyTabsNav({ propertyId }: { propertyId: string }) {
  return <TabsNav group={PROPERTY_DETAIL_TAB_GROUP} propertyId={propertyId} />
}
