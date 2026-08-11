import { unitStatuses } from '../schema/units.js'
import type { OrganizationTx } from '../db/index.js'

// UI-SPEC color/icon keys (Pattern 6). is_system=true marks these as protected defaults —
// rename allowed, delete/archive restricted per UI-SPEC.
const DEFAULT_UNIT_STATUSES = [
  { name: 'Available', iconKey: 'IconCircleCheck', colorKey: 'green', sortOrder: 0 },
  { name: 'Occupied', iconKey: 'IconPeople', colorKey: 'blue', sortOrder: 1 },
  { name: 'Maintenance', iconKey: 'IconWrench', colorKey: 'amber', sortOrder: 2 },
] as const

/**
 * Seeds Available/Occupied/Maintenance for an organization if missing (D-26).
 * Idempotent via ON CONFLICT DO NOTHING on (organization_id, name) — safe to call from
 * unitStatuses.list / units.create in Phase 4, not just at org-create time, since many
 * organizations already exist before this table did.
 */
export async function ensureDefaultUnitStatuses(organizationId: string, tx: OrganizationTx): Promise<void> {
  await tx
    .insert(unitStatuses)
    .values(
      DEFAULT_UNIT_STATUSES.map((status) => ({
        organizationId,
        name: status.name,
        iconKey: status.iconKey,
        colorKey: status.colorKey,
        sortOrder: status.sortOrder,
        isSystem: true,
      })),
    )
    .onConflictDoNothing({ target: [unitStatuses.organizationId, unitStatuses.name] })
}
