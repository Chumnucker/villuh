import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

export type AuthProxyRoutes = {
  home: string
  login: string
}

/**
 * Optimistic auth redirects via session-cookie presence only.
 * Not a security boundary — call requireMe() / requireSession() in protected layouts.
 *
 * Matcher must be inlined in each app's proxy.ts (Next requires a statically
 * analyzable string/array — imported constants are rejected).
 */
export function createAuthProxy(routes: AuthProxyRoutes) {
  return function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl
    const isAuthPath = pathname.startsWith("/auth")
    const sessionCookie = getSessionCookie(request)

    // Do not bounce /auth/* → home on cookie presence alone. requireMe() is the
    // real gate; a session cookie without a usable org/session used to fight
    // that redirect and spin (home → login → home).

    if (!sessionCookie && !isAuthPath) {
      const login = new URL(routes.login, request.url)
      login.searchParams.set("next", `${pathname}${search}`)
      return NextResponse.redirect(login)
    }

    return NextResponse.next()
  }
}
