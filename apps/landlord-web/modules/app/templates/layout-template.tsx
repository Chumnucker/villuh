import { NavigationBreadcrumbs, SearchInput } from "@villuh/ui"
import { AppSidebar } from "@/modules/app/components/sidebar"

type SidebarTemplateProps = {
  children: React.ReactNode
  appName?: string
}

/**
 * Landlord app chrome: left sidebar + top bar (breadcrumbs / search) + page content.
 *
 * Lives in `(app)/layout.tsx` so it persists across navigations.
 * Page body is wrapped by `(app)/template.tsx` ViewTransition — only that fades.
 */
export function LayoutTemplate({
  children,
  appName = "Villuh",
}: SidebarTemplateProps) {
  return (
    <div className="flex min-h-svh bg-background">
      <AppSidebar appName={appName} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-navbar shrink-0 items-center gap-4 border-b bg-card px-page [view-transition-name:app-topbar]">
          <NavigationBreadcrumbs />
          <SearchInput
            placeholder="Search features or items"
            className="w-56"
          />
        </header>

        <main className="flex-1 overflow-auto p-content">{children}</main>
      </div>
    </div>
  )
}
