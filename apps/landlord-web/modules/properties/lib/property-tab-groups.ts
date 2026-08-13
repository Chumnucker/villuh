import type { Route } from "next"
import type { PlatformIconName } from "@villuh/ui"
import { ROUTES } from "@/app/routes"

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Route<T> is invariant per literal path; a shared tab type needs the escape hatch.
type TabHref = (propertyId: string) => Route<any>

export type PropertyTab = {
  /** Identity for the `Tabs` component — unrelated to the URL. */
  value: string
  label: string
  icon: PlatformIconName
  href: TabHref
}

export type PropertyTabGroup = {
  tabs: PropertyTab[]
  /** The tab that owns `pathname`, falling back to the group's index tab. */
  activeValue: (pathname: string, propertyId: string) => string
  /**
   * Collapses a pathname owned by this group down to the group's base path, or
   * `null` when the pathname sits outside the group. Used as the app-wide
   * view-transition key so switching tabs doesn't remount the shared layout.
   */
  matchBase: (pathname: string) => string | null
}

/**
 * Stand-in property id used to turn the `href` builders into path templates.
 * Must not contain a `/` and must never collide with a real id.
 */
const ID_PROBE = "__propertyId__"

/**
 * Bundles a set of sibling tabs that share one persistent nested layout.
 *
 * Everything is derived from the `href` builders the links themselves use, so
 * there's no second list of URL slugs to keep in sync — adding a tab to `tabs`
 * is enough for the nav, the active-tab highlight, and the transition key to
 * all pick it up.
 */
function createPropertyTabGroup({
  base,
  tabs,
}: {
  /** Route of the group's index tab, e.g. `ROUTES.propertySettings`. */
  base: TabHref
  tabs: PropertyTab[]
}): PropertyTabGroup {
  const baseTemplate = base(ID_PROBE) as string
  const [prefix = "", suffix = ""] = baseTemplate.split(ID_PROBE)

  // Path remainders below the base — `""` for the index tab, `"/units"`, etc.
  const segments = new Set(
    tabs.map((tab) => (tab.href(ID_PROBE) as string).slice(baseTemplate.length))
  )

  return {
    tabs,

    activeValue(pathname, propertyId) {
      const basePath = `${prefix}${propertyId}${suffix}`
      const match = tabs.find((tab) => {
        const href = tab.href(propertyId) as string
        // The index tab shares its prefix with every sibling, so it only counts
        // on an exact hit; the rest also own their sub-paths.
        return href === basePath
          ? pathname === basePath
          : pathname === href || pathname.startsWith(`${href}/`)
      })
      return match?.value ?? tabs[0]?.value ?? ""
    },

    matchBase(pathname) {
      if (!pathname.startsWith(prefix)) return null
      const propertyId = pathname.slice(prefix.length).split("/")[0]
      if (!propertyId) return null

      const basePath = `${prefix}${propertyId}${suffix}`
      if (pathname === basePath) return basePath
      if (!pathname.startsWith(`${basePath}/`)) return null

      // Anything deeper that isn't one of our tabs is a different page that
      // happens to nest here — let it transition normally.
      return segments.has(pathname.slice(basePath.length)) ? basePath : null
    },
  }
}

export const PROPERTY_DETAIL_TAB_GROUP = createPropertyTabGroup({
  base: ROUTES.propertyDetail,
  tabs: [
    {
      value: "about",
      label: "About",
      icon: "IconNotebook",
      href: ROUTES.propertyDetail,
    },
    {
      value: "units",
      label: "Units",
      icon: "IconDoor",
      href: ROUTES.propertyUnits,
    },
    {
      value: "gallery",
      label: "Gallery",
      icon: "IconCloudUpload",
      href: ROUTES.propertyGallery,
    },
    {
      value: "tenants",
      label: "Tenants",
      icon: "IconTeam",
      href: ROUTES.propertyTenants,
    },
    {
      value: "analytics",
      label: "Analytics",
      icon: "IconListBullets",
      href: ROUTES.propertyAnalytics,
    },
  ],
})

export const PROPERTY_SETTINGS_TAB_GROUP = createPropertyTabGroup({
  base: ROUTES.propertySettings,
  tabs: [
    {
      value: "general",
      label: "General",
      icon: "IconSettingsGear2",
      href: ROUTES.propertySettings,
    },
    {
      value: "units",
      label: "Units",
      icon: "IconDoor",
      href: ROUTES.propertySettingsUnits,
    },
    {
      value: "amenities",
      label: "Amenities",
      icon: "IconStar",
      href: ROUTES.propertySettingsAmenities,
    },
    {
      value: "integrations",
      label: "Integrations",
      icon: "IconChainLink1",
      href: ROUTES.propertySettingsIntegrations,
    },
    {
      value: "gallery",
      label: "Gallery",
      icon: "IconCloudUpload",
      href: ROUTES.propertySettingsGallery,
    },
    {
      value: "team",
      label: "Team",
      icon: "IconTeam",
      href: ROUTES.propertySettingsTeam,
    },
  ],
})

/** Every tab group that owns a persistent layout, for `PageTransition`. */
export const PROPERTY_TAB_GROUPS: PropertyTabGroup[] = [
  PROPERTY_DETAIL_TAB_GROUP,
  PROPERTY_SETTINGS_TAB_GROUP,
]
