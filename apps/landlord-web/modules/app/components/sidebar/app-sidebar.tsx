"use client"

import { ScrollArea } from "@villuh/ui"
import { SIDEBAR_NAV } from "@/modules/app/config/sidebar-nav"
import { SidebarHeader } from "./sidebar-header"
import { SidebarNavGroupSection } from "./sidebar-nav-group"
import { SidebarUserMenu } from "./sidebar-user-menu"

type AppSidebarProps = {
  appName?: string
}

export function AppSidebar({ appName }: AppSidebarProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-card [view-transition-name:app-sidebar]">
      <SidebarHeader appName={appName} />
      <ScrollArea className="min-h-0 flex-1">
        <nav className="flex flex-col gap-4 p-page" aria-label="Main">
          {SIDEBAR_NAV.map((group) => (
            <SidebarNavGroupSection key={group.id} group={group} />
          ))}
        </nav>
      </ScrollArea>
      <div className="shrink-0 border-t p-page">
        <SidebarUserMenu />
      </div>
    </aside>
  )
}
