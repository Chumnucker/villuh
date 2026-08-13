"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { PlatformIcon, Tabs, TabsList, TabsTab } from "@villuh/ui"
import type { PropertyTabGroup } from "@/modules/properties/lib/property-tab-groups"

/**
 * Route-driven tab bar shared by the property detail and property settings
 * layouts — real `<Link>`s (shareable URLs, browser history) styled with the
 * shared `Tabs` underline variant. Which tabs it shows comes entirely from the
 * `group` (see `lib/property-tab-groups.ts`), including active detection.
 */
export function PropertyTabsNav({
  group,
  propertyId,
}: {
  group: PropertyTabGroup
  propertyId: string
}) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <Tabs
      value={group.activeValue(pathname, propertyId)}
      onValueChange={(value) => {
        const tab = group.tabs.find((t) => t.value === value)
        if (tab) router.push(tab.href(propertyId))
      }}
    >
      <TabsList variant="underline">
        {group.tabs.map((tab) => (
          <TabsTab
            key={tab.value}
            value={tab.value}
            render={<Link href={tab.href(propertyId)} />}
          >
            <PlatformIcon icon={tab.icon} size={16} />
            {tab.label}
          </TabsTab>
        ))}
      </TabsList>
    </Tabs>
  )
}
