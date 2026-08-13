import { requireMe } from "@villuh/api/require-me"
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
    </UserProvider>
  )
}
