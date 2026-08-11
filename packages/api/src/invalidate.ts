import type { trpc } from "./trpc"

export type TrpcUtils = ReturnType<typeof trpc.useUtils>

type InvalidateTarget = (utils: TrpcUtils) => {
  invalidate: (...args: never[]) => Promise<unknown>
}

/** Invalidate one or more tRPC query caches (by domain). */
export async function invalidateQueries(
  utils: TrpcUtils,
  targets: InvalidateTarget[]
) {
  await Promise.all(targets.map((target) => target(utils).invalidate()))
}

/**
 * Mutation `onSuccess` handler that invalidates related query caches.
 *
 * @example
 * ```ts
 * const utils = trpc.useUtils()
 * trpc.properties.create.useMutation({
 *   onSuccess: invalidateOnSuccess(utils, [
 *     (u) => u.properties.list,
 *     (u) => u.me.get, // quotas / counts
 *   ]),
 * })
 * ```
 *
 * When you also need side effects (toast, redirect), call `invalidateQueries` instead:
 * ```ts
 * onSuccess: async () => {
 *   await invalidateQueries(utils, [(u) => u.me.get])
 *   toast.success("Saved")
 * }
 * ```
 */
export function invalidateOnSuccess(
  utils: TrpcUtils,
  targets: InvalidateTarget[]
) {
  return () => invalidateQueries(utils, targets)
}
