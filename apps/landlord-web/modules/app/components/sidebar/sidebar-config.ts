import type { Route } from "next"
import type { PlatformIconName } from "@villuh/ui"
import { ROUTES } from "@/app/routes"

export type SidebarNavItem = {
  label: string
  href: Route
  icon: PlatformIconName
}

export type SidebarNavGroup = {
  id: string
  /** Section label above the items. Omit for an unlabeled cluster (e.g. Home). */
  label?: string
  items: SidebarNavItem[]
}

/**
 * Landlord app sidebar navigation.
 * Add / reorder groups and items here — the sidebar maps this config.
 */
export const SIDEBAR_NAV: SidebarNavGroup[] = [
  {
    id: "overview",
    items: [
      {
        label: "Home",
        href: ROUTES.home,
        icon: "IconHomeDoor",
      },
    ],
  },
  {
    id: "manage",
    label: "Manage",
    items: [
      {
        label: "Properties",
        href: ROUTES.properties,
        icon: "IconBuildings",
      },
      {
        label: "Units",
        href: ROUTES.units,
        icon: "IconDoor",
      },
      {
        label: "Tenants",
        href: ROUTES.tenants,
        icon: "IconPeople",
      },
      {
        label: "Leases",
        href: ROUTES.leases,
        icon: "IconNotebook",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      {
        label: "Onboarding",
        href: ROUTES.onboarding,
        icon: "IconClipboard2",
      },
      {
        label: "Documents",
        href: ROUTES.documents,
        icon: "IconFileText",
      },
      {
        label: "Rent",
        href: ROUTES.rent,
        icon: "IconCurrencyDollar",
      },
      {
        label: "Inbox",
        href: ROUTES.inbox,
        icon: "IconInboxEmpty",
      },
    ],
  },
  {
    id: "organization",
    label: "Organization",
    items: [
      {
        label: "Members",
        href: ROUTES.members,
        icon: "IconTeam",
      },
      {
        label: "Billing",
        href: ROUTES.billing,
        icon: "IconCreditCard1",
      },
      {
        label: "Settings",
        href: ROUTES.settings,
        icon: "IconSettingsGear2",
      },
    ],
  },
]
