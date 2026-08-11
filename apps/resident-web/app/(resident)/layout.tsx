import { Suspense } from "react"
import { Skeleton } from "@villuh/ui"
import { requireMe } from "@villuh/api/require-me"
import { UserProvider } from "@/modules/app/providers/me-provider"
import { ROUTES } from "@/app/routes"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh flex-col gap-4 p-content">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <AuthedApp>{children}</AuthedApp>
    </Suspense>
  )
}

async function AuthedApp({ children }: { children: React.ReactNode }) {
  const me = await requireMe(ROUTES.auth.login)

  return <UserProvider initialUser={me}>{children}</UserProvider>
}
