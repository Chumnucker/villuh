"use client"

import { createContext, useContext, useEffect } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@villuh/api/trpc"
import { ROUTES } from "@/app/routes"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@villuh/server/router"

type RouterOutput = inferRouterOutputs<AppRouter>
export type Me = RouterOutput["me"]["get"]

export const ME_QUERY_KEY = ["trpc", "me", "get"] as const

type UserContext = { user: Me; refresh: () => Promise<void> }
const UserContext = createContext<UserContext | null>(null)

/**
 * Resident shell user gate. Currently uses the shared /me endpoint;
 * replace with a resident-specific session query when that API exists.
 */
export function UserProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode
  /** Server-fetched me — required for instant SSR / first paint. */
  initialUser: Me
}) {
  const router = useRouter()
  const utils = trpc.useUtils()

  const { data: user, error } = trpc.me.get.useQuery(undefined, {
    retry: false,
    initialData: initialUser,
  })

  useEffect(() => {
    if (error) router.replace(ROUTES.auth.login)
  }, [error, router])

  if (error || !user) return null

  return (
    <UserContext.Provider
      value={{ user, refresh: () => utils.me.get.invalidate() }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): UserContext {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error("useUser must be used inside UserProvider")
  return ctx
}
