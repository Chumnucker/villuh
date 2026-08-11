import "server-only"
import type { Route } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "./server"
import { ROUTES } from "./routes"

/**
 * Real auth boundary for protected layouts/pages.
 * Proxy only does optimistic cookie redirects — always use this (or equivalent)
 * before rendering protected UI or running privileged server work.
 */
export async function requireSession(loginPath: string = ROUTES.auth.login) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect(loginPath as Route)
  return session
}
