"use client"

import { cn } from "@/lib/utils"
import { PlatformIcon } from "@/modules/common/ui/icon"
import { Skeleton } from "@/modules/common/ui/skeleton"
import clsx from "clsx"
import Link from "next/link"
import type { Route } from "next"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import { useLayout } from "../../providers/layout-provider"

const STATIC_LABELS: Record<string, string> = {
  ["//"]: "Home",
  ["/organization"]: "Organization",
  ["/organization/settings"]: "Settings",
  ["/jobs"]: "Jobs",
  ["/search"]: "Talent Search",
}
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type BreadcrumbsType = {
  values: Record<
    string,
    | string
    | {
        label: string
        href: string
        interactable?: boolean
      }
  >
}

type PathPart = {
  label: string
  href: string
  uuid: boolean
  custom: boolean
}

export function NavigationBreadcrumbs({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const pathname = usePathname()
  const { breadcrumbs } = useLayout()
  const crumbs: PathPart[] = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean)
    if (parts.length > 1) {
      const last = parts[parts.length - 1]
      // if (!UUID_REGEX.test(last)) {
      //   parts.pop();
      // }
    }
    if (parts.length === 0) parts.push("/")
    return parts.map((part) => {
      let href = `/${parts.slice(0, parts.indexOf(part) + 1).join("/")}`
      const uuid = UUID_REGEX.test(part)
      let label = STATIC_LABELS[href]
      let custom = false
      let interactable = false

      const customVal = breadcrumbs.values[part]
      if (customVal) {
        const isLabel = typeof customVal === "string"
        label = isLabel ? customVal : customVal.label
        href = isLabel ? href : customVal.href
        custom = true
        interactable = isLabel ? false : !!customVal.interactable
      }
      if (!label) {
        // hello_world-hi -> hello world hi
        label = part.replace(/-/g, " ").replace(/_/g, " ")
      }
      return {
        label,
        href,
        custom,
        uuid,
        interactable,
      }
    })
  }, [pathname, breadcrumbs])

  return (
    <div
      className={cn(
        "flex flex-1 items-center gap-1.5 text-sm font-medium text-muted-foreground",
        className
      )}
      {...props}
    >
      <p>Villuh</p>
      <PlatformIcon icon="IconChevronRightSmall" size={16} strokeWidth={2} />
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1
        return (
          <div
            key={crumb.href}
            className="flex items-center gap-1.5 capitalize"
          >
            {crumb.uuid && !crumb.custom ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <Link
                href={crumb.href as Route}
                className={clsx(
                  "max-w-32 truncate duration-200 hover:opacity-50",
                  {
                    "text-foreground": isLast,
                  }
                )}
              >
                {crumb.label}
              </Link>
            )}
            {!isLast && (
              <PlatformIcon
                icon="IconChevronRightSmall"
                size={16}
                strokeWidth={2}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
