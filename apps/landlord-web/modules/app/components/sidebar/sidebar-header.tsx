"use client"

import { Button, PlatformIcon } from "@villuh/ui"
import { ROUTES } from "@/app/routes"
import Link from "next/link"

type SidebarHeaderProps = {
  appName?: string
}

export function SidebarHeader({ appName = "Villuh" }: SidebarHeaderProps) {
  return (
    <div className="flex h-navbar shrink-0 items-center justify-between border-b px-page">
      <Link
        href={ROUTES.home}
        className="font-mono text-2xl font-medium tracking-tight text-foreground"
      >
        {appName}
      </Link>

      <Button variant="ghost-muted" size="icon" aria-label="Notifications">
        <PlatformIcon
          icon="IconBell2"
          className="size-4.5"
          size={20}
          strokeWidth={2}
        />
      </Button>
    </div>
  )
}
