import { requireMe } from "@villuh/api/require-me"
import { UserProvider } from "@/modules/app/providers/me-provider"
import { ROUTES } from "@/app/routes"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // requireMe() calls redirect() — must not sit inside <Suspense> or Next.js
  // retries the RSC forever (home GET / loop).
  const me = await requireMe(ROUTES.auth.login)

  return <UserProvider initialUser={me}>{children}</UserProvider>
}
