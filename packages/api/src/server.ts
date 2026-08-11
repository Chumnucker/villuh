import "server-only"
import { createTRPCClient, httpBatchLink } from "@trpc/client"
import { headers } from "next/headers"
import type { AppRouter } from "@villuh/server/router"

/**
 * Typed tRPC client for Server Components / layouts.
 * Forwards the incoming request cookies to the Express API.
 */
export async function createServerTrpc() {
  const cookie = (await headers()).get("cookie") ?? ""
  const url = `${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/trpc`

  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url,
        headers() {
          return { cookie }
        },
      }),
    ],
  })
}
