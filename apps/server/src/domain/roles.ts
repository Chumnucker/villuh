import { z } from 'zod'

/** Org membership roles used across Better Auth, permissions, and tRPC. */
export const ROLES = ['owner', 'manager', 'viewer'] as const
export type Role = (typeof ROLES)[number]

export const zRole = z.enum(ROLES)

/**
 * Better Auth's `member.role` is a free-text column that still carries its
 * built-in values (`member`/`admin`) for rows we didn't write. Narrow with
 * this before a role reaches the `org_role` enum in `role_permissions`.
 */
export function isRole(value: string | null | undefined): value is Role {
  return !!value && (ROLES as readonly string[]).includes(value)
}

/** Better Auth built-in roles we must still register when overriding `roles`. */
export const BETTER_AUTH_BUILTIN_ROLES = ['owner', 'admin', 'member'] as const
