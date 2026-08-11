export { trpc } from "./trpc"
export type { AppRouter } from "./trpc"
export { TRPCProvider } from "./trpc-provider"
export { invalidateOnSuccess, invalidateQueries } from "./invalidate"
export type { TrpcUtils } from "./invalidate"
// Server-only: import from "@villuh/api/server" or "@villuh/api/require-me"
// — never from this barrel (client code imports @villuh/api).

