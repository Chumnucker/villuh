"use client"

import { LinkButton, PlatformIcon, cn } from "@villuh/ui"
import { usePathname } from "next/navigation"
import type { SidebarNavItem } from "@/modules/app/components/sidebar/sidebar-config"

function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

type SidebarNavItemLinkProps = {
  item: SidebarNavItem
}

export function SidebarNavItemLink({ item }: SidebarNavItemLinkProps) {
  const pathname = usePathname()
  const active = isNavActive(pathname, item.href)

  return (
    <LinkButton
      href={item.href}
      variant={active ? "ghost-muted" : "ghost"}
      className={cn(
        "w-full justify-start gap-2 text-secondary-foreground",
        active && "bg-muted text-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      <PlatformIcon icon={item.icon} size={20} strokeWidth={2} />
      {item.label}
    </LinkButton>
  )
}
