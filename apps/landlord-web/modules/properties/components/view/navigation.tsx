"use client"

import Link from "next/link"
import type { Route } from "next"
import { usePathname, useRouter } from "next/navigation"
import {
  PlatformIcon,
  Tabs,
  TabsList,
  TabsTab,
  type PlatformIconName,
} from "@villuh/ui"
import { ROUTES } from "@/app/routes"

type PropertyTab = {
  value: string
  label: string
  icon: PlatformIconName
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Route<T> is invariant per literal path; a shared array type needs the escape hatch.
  href: (propertyId: string) => Route<any>
}

const PROPERTY_TABS: PropertyTab[] = [
  { value: "about", label: "About", icon: "IconHouse", href: ROUTES.propertyDetail },
  { value: "units", label: "Units", icon: "IconDoor", href: ROUTES.propertyUnits },
  {
    value: "gallery",
    label: "Gallery",
    icon: "IconCloudUpload",
    href: ROUTES.propertyGallery,
  },
  { value: "tenants", label: "Tenants", icon: "IconTeam", href: ROUTES.propertyTenants },
  {
    value: "analytics",
    label: "Analytics",
    icon: "IconListBullets",
    href: ROUTES.propertyAnalytics,
  },
]

/**
 * Route-driven tab bar for the property detail nested layout — real `<Link>`s
 * (shareable URLs, browser history) styled with the shared `Tabs` underline
 * variant. Matches `SidebarNavItemLink`'s `usePathname` active-detection.
 */
export function PropertyTabsNav({ propertyId }: { propertyId: string }) {
  const pathname = usePathname()
  const router = useRouter()

  const activeTab =
    PROPERTY_TABS.find((tab) => {
      const href = tab.href(propertyId)
      return tab.value === "about"
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`)
    })?.value ?? "about"

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        const tab = PROPERTY_TABS.find((t) => t.value === value)
        if (tab) router.push(tab.href(propertyId))
      }}
    >
      <TabsList variant="underline">
        {PROPERTY_TABS.map((tab) => (
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
