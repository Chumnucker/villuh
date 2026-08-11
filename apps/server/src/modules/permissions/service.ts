import { and, eq } from 'drizzle-orm'
import { rolePermissions } from '../../schema/role-permissions.js'
import { withOrganization, type OrganizationTx } from '../../db/index.js'
import {
  ACTION_CATEGORIES,
  ROLES,
  type ActionCategory,
  type Role,
} from '../../domain/index.js'

/**
 * Default permission sets per D-09.
 * Owner: all true.
 * Manager: writes + financial + comms (no admin).
 * Viewer: read-only (all false).
 */
export const DEFAULT_PERMISSIONS: Record<Role, Record<ActionCategory, boolean>> = {
  owner: { write: true, financial: true, communications: true, admin: true },
  manager: { write: true, financial: true, communications: true, admin: false },
  viewer: { write: false, financial: false, communications: false, admin: false },
}

/**
 * Seed the 12 default permission rows for a new org (3 roles × 4 actions).
 */
export async function seedDefaultPermissions(orgId: string): Promise<void> {
  const rows: Array<{
    organizationId: string
    role: Role
    action: ActionCategory
    allowed: boolean
  }> = []
  for (const role of ROLES) {
    for (const action of ACTION_CATEGORIES) {
      rows.push({
        organizationId: orgId,
        role,
        action,
        allowed: DEFAULT_PERMISSIONS[role][action],
      })
    }
  }
  await withOrganization(orgId, 'system', async (tx) => {
    for (const row of rows) {
      await tx
        .insert(rolePermissions)
        .values(row)
        .onConflictDoNothing({
          target: [rolePermissions.organizationId, rolePermissions.role, rolePermissions.action],
        })
    }
  })
}

async function loadRolePermissionsWithTx(
  tx: OrganizationTx,
  orgId: string,
  role: Role,
): Promise<Record<ActionCategory, boolean>> {
  const rows = await tx
    .select()
    .from(rolePermissions)
    .where(and(eq(rolePermissions.organizationId, orgId), eq(rolePermissions.role, role)))
  const result: Record<ActionCategory, boolean> = { ...DEFAULT_PERMISSIONS[role] }
  for (const row of rows) {
    if (ACTION_CATEGORIES.includes(row.action as ActionCategory)) {
      result[row.action as ActionCategory] = row.allowed
    }
  }
  return result
}

/**
 * Load the permission map for a single role within an org.
 * Pass `tx` when already inside `withOrganization` to avoid nested transactions.
 */
export async function loadRolePermissions(
  orgId: string,
  role: Role,
  tx?: OrganizationTx,
): Promise<Record<ActionCategory, boolean>> {
  if (tx) return loadRolePermissionsWithTx(tx, orgId, role)
  return withOrganization(orgId, 'system', (inner) => loadRolePermissionsWithTx(inner, orgId, role))
}

/**
 * Check whether a given role is allowed a given action.
 * Owner short-circuits to true (D-09).
 */
export async function isAllowed(
  orgId: string,
  role: Role,
  action: ActionCategory,
  tx?: OrganizationTx,
): Promise<boolean> {
  if (role === 'owner') return true
  const perms = await loadRolePermissions(orgId, role, tx)
  return perms[action] ?? false
}
