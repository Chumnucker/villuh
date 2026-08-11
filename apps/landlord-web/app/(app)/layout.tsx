import { Suspense } from "react"
import { requireMe } from "@villuh/api/require-me"
import { UserProvider } from "@/modules/app/providers/me-provider"
import { LayoutTemplate } from "@/modules/app/templates/layout-template"
import { LayoutTemplateSkeleton } from "@/modules/app/templates/layout-template-skeleton"
import { ROUTES } from "@/app/routes"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LayoutTemplateSkeleton />}>
      <AuthedApp>{children}</AuthedApp>
    </Suspense>
  )
}

async function AuthedApp({ children }: { children: React.ReactNode }) {
  const me = await requireMe(ROUTES.auth.login)

  return (
    <UserProvider initialUser={me}>
      <LayoutTemplate>{children}</LayoutTemplate>
    </UserProvider>
  )
}
