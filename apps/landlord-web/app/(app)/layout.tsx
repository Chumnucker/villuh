import { requireMe } from "@villuh/api/require-me"
import { LandlordOverlays } from "@/modules/app/components/app-overlays"
import { UserProvider } from "@/modules/app/providers/me-provider"
import { LayoutTemplate } from "@/modules/app/templates/layout-template"
import { ROUTES } from "@/app/routes"
import { PageTransition } from "./page-transition"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // requireMe() calls redirect() — must not sit inside <Suspense> or Next.js
  // retries the RSC forever (home GET / loop).
  const me = await requireMe(ROUTES.auth.login)

  return (
    <UserProvider initialUser={me}>
      <LayoutTemplate>
        <PageTransition>{children}</PageTransition>
      </LayoutTemplate>
      {/*
        D-34, both halves:
          inside <UserProvider>  — ManageUnitStatusesDialog calls useUser()
          outside <PageTransition> — that is a ViewTransition keyed on pathname;
                                     an open overlay inside it would fade or
                                     remount on every navigation
        A sibling of LayoutTemplate rather than a child of it, so no app-chrome
        container's overflow or stacking context can clip a portal root.
      */}
      <LandlordOverlays />
    </UserProvider>
  )
}
