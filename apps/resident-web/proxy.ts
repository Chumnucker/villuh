import { createAuthProxy } from "@villuh/auth/proxy"
import { ROUTES } from "@/app/routes"

export const proxy = createAuthProxy({
  home: ROUTES.home,
  login: ROUTES.auth.login,
})

// Must be an inline literal — Next statically analyzes this at build time.
export const config = {
  matcher: [
    "/((?!api|trpc|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
}
