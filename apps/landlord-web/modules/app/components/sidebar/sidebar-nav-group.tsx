import type { SidebarNavGroup } from "@/modules/app/config/sidebar-nav"
import { SidebarNavItemLink } from "./sidebar-nav-item"

type SidebarNavGroupProps = {
  group: SidebarNavGroup
}

export function SidebarNavGroupSection({ group }: SidebarNavGroupProps) {
  return (
    <div className="flex flex-col gap-1">
      {group.label ? (
        <p className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {group.label}
        </p>
      ) : null}
      {group.items.map((item) => (
        <SidebarNavItemLink key={item.href} item={item} />
      ))}
    </div>
  )
}
