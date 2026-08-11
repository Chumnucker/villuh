import { z } from 'zod'

/** Org membership roles used across Better Auth, permissions, and tRPC. */
export const ROLES = ['owner', 'manager', 'viewer'] as const
export type Role = (typeof ROLES)[number]

export const zRole = z.enum(ROLES)

/** Better Auth built-in roles we must still register when overriding `roles`. */
export const BETTER_AUTH_BUILTIN_ROLES = ['owner', 'admin', 'member'] as const
