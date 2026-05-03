"use client"

import { createContext, useContext, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { ROUTES } from '@/app/routes'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@villuh/server/router'

type RouterOutput = inferRouterOutputs<AppRouter>
export type Me = RouterOutput['me']['get']

export const ME_QUERY_KEY = ['trpc', 'me', 'get'] as const

type UserContext = { user: Me; refresh: () => Promise<void> }
const UserContext = createContext<UserContext | null>(null)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const utils = trpc.useUtils()

  const { data: user, error, isPending } = trpc.me.get.useQuery(undefined, { retry: false })

  useEffect(() => {
    if (error) router.replace(ROUTES.auth.login)
  }, [error])

  if (isPending || error || !user) return null

  return (
    <UserContext.Provider value={{ user, refresh: () => utils.me.get.invalidate() }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): UserContext {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}
