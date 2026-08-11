import { TRPCError } from '@trpc/server'
import type { TRPC_ERROR_CODE_KEY } from '@trpc/server/rpc'

/** Application-level error codes (distinct from tRPC transport codes). */
export const APP_ERROR_CODES = [
  'PLAN_LIMIT',
  'SUBSCRIPTION_REQUIRED',
  'OWNER_PERMISSIONS_LOCKED',
] as const
export type AppErrorCode = (typeof APP_ERROR_CODES)[number]

export type AppErrorCause = {
  appCode: AppErrorCode
  meta?: Record<string, unknown>
}

export function isAppErrorCause(cause: unknown): cause is AppErrorCause {
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'appCode' in cause &&
    typeof (cause as AppErrorCause).appCode === 'string'
  )
}

type ThrowOpts = {
  code: TRPC_ERROR_CODE_KEY
  message: string
  appCode?: AppErrorCode
  meta?: Record<string, unknown>
}

/** Throw a typed tRPC error; optional appCode lands in errorFormatter `data`. */
export function throwAppError(opts: ThrowOpts): never {
  const cause: AppErrorCause | undefined = opts.appCode
    ? { appCode: opts.appCode, meta: opts.meta }
    : undefined
  throw new TRPCError({
    code: opts.code,
    message: opts.message,
    cause,
  })
}

export function unauthorized(message = 'Unauthorized'): never {
  throwAppError({ code: 'UNAUTHORIZED', message })
}

export function forbidden(message = 'Forbidden', appCode?: AppErrorCode, meta?: Record<string, unknown>): never {
  throwAppError({ code: 'FORBIDDEN', message, appCode, meta })
}

export function badRequest(message: string, appCode?: AppErrorCode, meta?: Record<string, unknown>): never {
  throwAppError({ code: 'BAD_REQUEST', message, appCode, meta })
}

export function notFound(message: string): never {
  throwAppError({ code: 'NOT_FOUND', message })
}

export function internalError(message: string): never {
  throwAppError({ code: 'INTERNAL_SERVER_ERROR', message })
}
