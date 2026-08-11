"use client"

import { authClient } from "../client"

/**
 * Reactive session hook. Wraps authClient.useSession().
 * Returns { data: Session | null, isPending: boolean, error: Error | null }
 * Use in client components that need to react to login/logout.
 */
export function useSession() {
  return authClient.useSession()
}
