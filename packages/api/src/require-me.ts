import "server-only"
import type { Route } from "next"
import { redirect } from "next/navigation"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@villuh/server/router"
import { createServerTrpc } from "./server"

export type Me = inferRouterOutputs<AppRouter>["me"]["get"]

/**
 * Layout auth gate: load me via typed tRPC (protectedProcedure).
 * On failure / unauthenticated → redirect to login.
 */
export async function requireMe(loginPath: string): Promise<Me> {
  try {
    const trpc = await createServerTrpc()
    return await trpc.me.get.query()
  } catch {
    redirect(loginPath as Route)
  }
}
