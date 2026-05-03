"use client"

import { createContext, useContext, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api, type Me } from "@/lib/api"
import { ROUTES } from "@/app/routes"

export { type Me }
export const ME_QUERY_KEY = ["me"] as const

async function fetchMe(): Promise<Me> {
  const res = await api.api.me.$get()
  if (!res.ok) throw new Error("unauthenticated")
  return res.json()
}

type UserContext = {
  user: Me
  refresh: () => Promise<void>
}

const UserContext = createContext<UserContext | null>(null)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: user, error, isPending } = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    retry: false,
  })

  useEffect(() => {
    if (error) router.replace(ROUTES.auth.login)
  }, [error])

  if (isPending || error || !user) return null

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
  }

  return (
    <UserContext.Provider value={{ user, refresh }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): UserContext {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error("useUser must be used inside UserProvider")
  return ctx
}
