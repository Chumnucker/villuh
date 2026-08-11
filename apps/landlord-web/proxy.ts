import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@villuh/auth/server'
import { ROUTES } from '@/app/routes'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static assets and internal Next.js routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) return NextResponse.next()

  // API routes are proxied to Hono — never apply auth redirects to them
  if (pathname.startsWith('/api')) return NextResponse.next()

  const isAuthPath = pathname.startsWith('/auth')

  const session = await auth.api.getSession({ headers: request.headers })

  // Logged-in user hitting auth pages → send to app
  if (session && isAuthPath) {
    return NextResponse.redirect(new URL(ROUTES.home, request.url))
  }

  // Unauthenticated user hitting protected pages → send to login
  if (!session && !isAuthPath) {
    return NextResponse.redirect(new URL(ROUTES.auth.login, request.url))
  }

  return NextResponse.next()
}
