import { rolePermissions } from '@villuh/db/schema/role-permissions'
import { and, eq } from 'drizzle-orm'
import { withTenant } from './tenant.js'

export const ACTION_CATEGORIES = ['write', 'financial', 'communications', 'admin'] as const
export type ActionCategory = (typeof ACTION_CATEGORIES)[number]

export const ROLES = ['owner', 'manager', 'viewer'] as const
export type Role = (typeof ROLES)[number]

/**
 * Default permission sets per D-09.
 * Owner: all true.
 * Manager: writes + financial + comms (no admin).
 * Viewer: read-only (all false).
 */
export const DEFAULT_PERMISSIONS: Record<Role, Record<ActionCategory, boolean>> = {
  owner:   { write: true,  financial: true,  communications: true,  admin: true  },
  manager: { write: true,  financial: true,  communications: true,  admin: false },
  viewer:  { write: false, financial: false, communications: false, admin: false },
}

/**
 * Seed the 12 default permission rows for a new org (3 roles × 4 actions).
 * Uses owner-context withTenant — system actor — and ON CONFLICT DO NOTHING for idempotency.
 * Called from Better Auth org plugin afterCreateOrganization hook.
 */
export async function seedDefaultPermissions(orgId: string): Promise<void> {
  const rows: Array<{ landlordId: string; role: Role; action: ActionCategory; allowed: boolean }> = []
  for (const role of ROLES) {
    for (const action of ACTION_CATEGORIES) {
      rows.push({
        landlordId: orgId,
        role,
        action,
        allowed: DEFAULT_PERMISSIONS[role][action],
      })
    }
  }
  await withTenant(orgId, 'system', async (tx) => {
    for (const row of rows) {
      await tx
        .insert(rolePermissions)
        .values(row)
        .onConflictDoNothing({
          target: [rolePermissions.landlordId, rolePermissions.role, rolePermissions.action],
        })
    }
  })
}

/**
 * Load the permission map for a single role within an org.
 * Returns { write, financial, communications, admin }.
 * If a row is missing for any category, fall back to DEFAULT_PERMISSIONS for that role.
 */
export async function loadRolePermissions(
  orgId: string,
  role: Role,
): Promise<Record<ActionCategory, boolean>> {
  return withTenant(orgId, 'system', async (tx) => {
    const rows = await tx
      .select()
      .from(rolePermissions)
      .where(
        and(eq(rolePermissions.landlordId, orgId), eq(rolePermissions.role, role)),
      )
    const result: Record<ActionCategory, boolean> = { ...DEFAULT_PERMISSIONS[role] }
    for (const row of rows) {
      if (ACTION_CATEGORIES.includes(row.action as ActionCategory)) {
        result[row.action as ActionCategory] = row.allowed
      }
    }
    return result
  })
}

/**
 * Check whether a given role is allowed a given action.
 * Owner short-circuits to true (D-09).
 */
export async function isAllowed(
  orgId: string,
  role: Role,
  action: ActionCategory,
): Promise<boolean> {
  if (role === 'owner') return true
  const perms = await loadRolePermissions(orgId, role)
  return perms[action] ?? false
}
