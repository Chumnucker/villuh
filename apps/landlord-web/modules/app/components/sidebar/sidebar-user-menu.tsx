"use client"

import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  PlatformIcon,
  cn,
} from "@villuh/ui"
import { authClient } from "@/lib/auth-client"
import { ROUTES } from "@/app/routes"
import { useUser } from "@/modules/app/providers/me-provider"

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}

export function SidebarUserMenu() {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const { user: me } = useUser()
  const { name, email, image } = me.user

  const isDark = resolvedTheme === "dark"

  async function handleSignOut() {
    const { error } = await authClient.signOut()
    if (error) {
      toast.error("Failed to log out. Please try again.")
      return
    }
    // Hard navigation (not router.replace) so all providers remount and
    // TanStack Query's client-side cache is cleared, preventing a second
    // user signing in on the same tab from seeing the previous user's data.
    window.location.href = ROUTES.auth.login
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto w-full justify-start gap-2.5 rounded-2xl px-2 py-2 text-left outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          )}
          aria-label="User menu"
        >
          <Avatar size="default" className="size-9">
            {image ? <AvatarImage src={image} alt="" /> : null}
            <AvatarFallback>{initialsFromName(name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {name}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {email}
            </span>
          </span>
          <PlatformIcon
            icon="IconChevronGrabberVertical"
            size={16}
            className="size-4 shrink-0 text-muted-foreground"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuItem onSelect={() => router.push(ROUTES.settings)}>
          <PlatformIcon icon="IconSettingsGear2" size={16} />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme(isDark ? "light" : "dark")}>
          <PlatformIcon icon={isDark ? "IconSun" : "IconMoon"} size={16} />
          {isDark ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => void handleSignOut()}
        >
          <PlatformIcon icon="IconDoor" size={16} />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
