import { createTRPCReact } from "@trpc/react-query"
import type { AppRouter } from "@villuh/server/router"

export const trpc = createTRPCReact<AppRouter>()
export type { AppRouter }
