# Tenant Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the tenant data core (`TENT-01–04`) — reusable tenant person records, a tenancy grouping that links people to a unit with co-tenants, an audit-derived per-tenant activity timeline, and archive-with-retention — architected so the Lease entity later extends the tenancy row without a migration.

**Architecture:** Three org-scoped, RLS-protected tables (`tenants`, `tenancies`, `tenancy_members`) with a DB-enforced "one active tenancy per unit" partial unique index. A `tenants` tRPC module mirrors the `units` module (router → service → Zod schemas). Occupancy is derived, never written into `units`. The activity timeline is a read-only query over the existing partitioned `audit_log`. The frontend adds a `modules/tenants` module (URL-backed `defineTable` list + `createOverlays` detail/form/archive) and wires the two existing stub tabs to real data.

**Tech Stack:** Drizzle ORM + Postgres (RLS), tRPC + Zod, Vitest (real-DB integration tests), Next.js App Router, `@villuh/ui` (`defineTable`, `createOverlays`), `@villuh/api` (tRPC hooks), `@tanstack/react-form`.

## Global Constraints

- **Org isolation:** every org-scoped table carries `organization_id text NOT NULL REFERENCES organization(id) ON DELETE cascade` + the `organization_isolation` RLS policy `organization_id = current_setting('app.current_organization_id', true)` + `.enableRLS()`. Every tRPC procedure wraps its DB work in `withOrganization(organizationId, userId, (tx) => …)`.
- **Money:** integer cents only (none in this slice, but never introduce float dollars).
- **Dates:** `date` type for tenancy `startDate`/`endDate` (lease-style dates), `timestamptz` for `createdAt`/`updatedAt`/`archivedAt`.
- **Enums:** the `tenancy_status` Postgres enum is declared in `apps/server/src/schema/enums.ts`, built from the same `as const` array the Zod validator uses; adding an option = edit that array **and** write a migration.
- **Audit triggers:** Drizzle does not emit them — append `CREATE TRIGGER … EXECUTE FUNCTION audit_log_trigger_fn();` for each new table to the generated migration SQL (the shared fn reads `app.current_organization_id` from the session GUC; see `0017_floor_plans.sql`).
- **Permissions:** reads use `protectedProcedure`; writes use `permissionProcedure('write')` (one of the four `ACTION_CATEGORIES` — no per-resource keys).
- **Shell contract:** Linux bash; git base `main`.
- **Migration is BLOCKING:** Task 2 requires a human checkpoint before proceeding.
- **Frontend gate:** `pnpm --filter @villuh/landlord-web build` must pass on every wave that touches app code (not just typecheck).

---

## File Structure

**Server (`apps/server/src/`):**
- Create `schema/tenants.ts` — `tenants`, `tenancies`, `tenancy_members` Drizzle tables.
- Modify `schema/enums.ts` — add `tenancyStatusEnum`.
- Modify `schema/index.ts` — export `./tenants.js`.
- Create `modules/tenants/schemas.ts` — Zod inputs + `TENANT_SORT_KEYS`.
- Create `modules/tenants/service.ts` — list/get/create/update/archive + tenancy ops + guards + activity.
- Create `modules/tenants/router.ts` — the tRPC router.
- Modify `router.ts` — register `tenants`.
- Modify `schemas/index.ts` — export tenant Zod schemas.
- Create `migrations/00NN_tenants.sql` (generated) + hand-appended trigger/index SQL.
- Create `src/__tests__/tenants.test.ts` — integration suite.

**Frontend (`apps/landlord-web/`):**
- Create `modules/tenants/lib/tenants.table.ts` — `defineTable`.
- Create `modules/tenants/lib/tenants.overlays.ts` — `createOverlays`.
- Create `modules/tenants/components/list/index.tsx` + `tenants-columns.tsx`.
- Create `modules/tenants/components/form/tenant-form-sheet.tsx` + `co-tenant-picker.tsx`.
- Create `modules/tenants/components/archive-tenant-dialog.tsx`.
- Create `modules/tenants/components/tenant/tenant-detail-sheet.tsx` (profile + co-tenants + tenancy history + timeline).
- Create `app/(app)/tenants/page.tsx`.
- Modify `modules/app/components/app-overlays.tsx` — mount `tenantOverlays`.
- Modify `modules/properties/templates/property-tenants-template.tsx` — render property-scoped tenants list.
- Modify `modules/units/components/unit/unit-detail-tabs.tsx` — render real tenant history.

---

## WAVE 1 — Schema & migration

### Task 1: Tenant tables + enum + schema barrel

**Files:**
- Create: `apps/server/src/schema/tenants.ts`
- Modify: `apps/server/src/schema/enums.ts`
- Modify: `apps/server/src/schema/index.ts`

**Interfaces:**
- Produces: Drizzle tables `tenants`, `tenancies`, `tenancyMembers`; enum `tenancyStatusEnum`; the `as const` `TENANCY_STATUSES`. Row types `typeof tenants.$inferSelect`, etc.

- [ ] **Step 1: Add the status enum source + pgEnum**

In `apps/server/src/schema/enums.ts`, add near the other palette enums:

```ts
/** Tenancy lifecycle (tenant slice). pending → active → ended. */
export const TENANCY_STATUSES = ['pending', 'active', 'ended'] as const
export const tenancyStatusEnum = pgEnum('tenancy_status', TENANCY_STATUSES)
```

- [ ] **Step 2: Create `schema/tenants.ts`**

```ts
import { sql } from 'drizzle-orm'
import { boolean, date, pgPolicy, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { villuhApp } from './rls.js'
import { organization } from './auth.js'
import { units } from './units.js'
import { tenancyStatusEnum } from './enums.js'

const orgIsolation = pgPolicy('organization_isolation', {
  as: 'permissive',
  for: 'all',
  to: villuhApp,
  using: sql`organization_id = current_setting('app.current_organization_id', true)`,
  withCheck: sql`organization_id = current_setting('app.current_organization_id', true)`,
})

/** Reusable person record. A tenant may recur across tenancies over time (UNIT-04). */
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  notes: text('notes'),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, () => [orgIsolation]).enableRLS()

/** Occupancy grouping. The future Lease entity extends this row (no re-plumbing). */
export const tenancies = pgTable('tenancies', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  unitId: uuid('unit_id').notNull().references(() => units.id, { onDelete: 'cascade' }),
  status: tenancyStatusEnum('status').notNull().default('pending'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, () => [orgIsolation]).enableRLS()

/** Co-tenant join. One primary per tenancy; unique (tenancy, tenant). */
export const tenancyMembers = pgTable('tenancy_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  tenancyId: uuid('tenancy_id').notNull().references(() => tenancies.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('tenancy_members_tenancy_tenant_unique').on(t.tenancyId, t.tenantId),
  orgIsolation,
]).enableRLS()
```

- [ ] **Step 3: Export from the schema barrel**

In `apps/server/src/schema/index.ts` add after `export * from './units.js'`:

```ts
export * from './tenants.js'
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @villuh/server exec tsc --noEmit`
Expected: PASS (no unused/import errors from the new file).

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/schema/tenants.ts apps/server/src/schema/enums.ts apps/server/src/schema/index.ts
git commit -m "feat(tenants): add tenants/tenancies/tenancy_members schema + tenancy_status enum"
```

### Task 2: Migration + audit triggers + single-active invariant [BLOCKING]

**Files:**
- Create: `apps/server/migrations/00NN_tenants.sql` (drizzle-kit generated, then hand-edited)

**Interfaces:**
- Produces: migrated DB with the three tables, the `tenancy_status` type, audit triggers, and the partial unique index.

- [ ] **Step 1: Generate the migration**

Run: `pnpm --filter @villuh/server exec drizzle-kit generate`
Expected: a new `migrations/00NN_tenants.sql` creating the enum, three tables, FKs, and the `organization_isolation` policies. Note the actual `NN` for later steps.

- [ ] **Step 2: Append audit triggers + partial unique index**

Append to the generated file (Drizzle emits neither):

```sql
--> statement-breakpoint
-- Tenant slice: attach audit triggers (shared fn reads app.current_organization_id).
CREATE TRIGGER tenants_audit
  AFTER INSERT OR UPDATE OR DELETE ON tenants
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
--> statement-breakpoint
CREATE TRIGGER tenancies_audit
  AFTER INSERT OR UPDATE OR DELETE ON tenancies
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
--> statement-breakpoint
CREATE TRIGGER tenancy_members_audit
  AFTER INSERT OR UPDATE OR DELETE ON tenancy_members
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
--> statement-breakpoint
-- At most one active, non-archived tenancy per unit (co-tenants share one tenancy).
CREATE UNIQUE INDEX tenancies_one_active_per_unit
  ON tenancies (unit_id)
  WHERE status = 'active' AND archived_at IS NULL;
```

- [ ] **Step 3: Apply the migration**

Run: `pnpm --filter @villuh/server exec drizzle-kit migrate`
Expected: applies cleanly; re-running reports no pending migrations.

- [ ] **Step 4: Verify objects exist**

Run the project's DB console (or a scratch tRPC/psql call) and confirm:
- `\d+ tenancies` shows the partial index `tenancies_one_active_per_unit`.
- `\dy` (or trigger listing) shows `tenants_audit`, `tenancies_audit`, `tenancy_members_audit`.
Expected: all present.

- [ ] **Step 5: [CHECKPOINT] Stop for human review of the applied migration**, then commit:

```bash
git add apps/server/migrations
git commit -m "feat(tenants): migration — tenant tables, audit triggers, single-active-tenancy index"
```

---

## WAVE 2 — Server API

### Task 3: Zod input schemas

**Files:**
- Create: `apps/server/src/modules/tenants/schemas.ts`
- Modify: `apps/server/src/schemas/index.ts`

**Interfaces:**
- Produces: `createTenantInputSchema`, `updateTenantInputSchema`, `tenantIdInputSchema`, `listTenantsInputSchema`, `createTenancyInputSchema`, `updateTenancyInputSchema`, `tenancyIdInputSchema`, `addCoTenantInputSchema`, `removeMemberInputSchema`, `TENANT_SORT_KEYS`, and the inferred `*Input` types.

- [ ] **Step 1: Write `modules/tenants/schemas.ts`**

```ts
import { z } from 'zod'
import { listQueryFields, listSearchSchema, filterIdListSchema, filterEmptyFlagSchema } from '@villuh/server/schemas/filters'
import { TENANCY_STATUSES } from '../../schema/enums.js'

export const createTenantInputSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
})
export type CreateTenantInput = z.infer<typeof createTenantInputSchema>

export const updateTenantInputSchema = createTenantInputSchema.partial().extend({
  tenantId: z.uuid(),
})
export type UpdateTenantInput = z.infer<typeof updateTenantInputSchema>

export const tenantIdInputSchema = z.object({ tenantId: z.uuid() })

/** Create a tenancy for a unit with one or more members (first listed is primary). */
export const createTenancyInputSchema = z.object({
  unitId: z.uuid(),
  status: z.enum(TENANCY_STATUSES).default('pending'),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  memberTenantIds: z.array(z.uuid()).min(1, 'At least one tenant is required'),
  primaryTenantId: z.uuid(),
})
export type CreateTenancyInput = z.infer<typeof createTenancyInputSchema>

export const updateTenancyInputSchema = z.object({
  tenancyId: z.uuid(),
  status: z.enum(TENANCY_STATUSES).optional(),
  startDate: z.string().date().nullish(),
  endDate: z.string().date().nullish(),
})
export type UpdateTenancyInput = z.infer<typeof updateTenancyInputSchema>

export const tenancyIdInputSchema = z.object({ tenancyId: z.uuid() })

export const addCoTenantInputSchema = z.object({
  tenancyId: z.uuid(),
  tenantId: z.uuid(),
})
export type AddCoTenantInput = z.infer<typeof addCoTenantInputSchema>

export const removeMemberInputSchema = z.object({
  tenancyId: z.uuid(),
  tenantId: z.uuid(),
})
export type RemoveMemberInput = z.infer<typeof removeMemberInputSchema>

/** Sort keys — ids match the frontend column accessors. */
export const TENANT_SORT_KEYS = ['name', 'email', 'currentUnit', 'status'] as const

export const listTenantsInputSchema = z
  .object({
    ...listQueryFields(TENANT_SORT_KEYS),
    search: listSearchSchema,
    unitIds: filterIdListSchema,
    excludeUnitIds: filterIdListSchema,
    /** `true` = unassigned only (no active/pending tenancy). */
    unitEmpty: filterEmptyFlagSchema,
    statusIn: z.array(z.enum(TENANCY_STATUSES)).optional(),
  })
  .optional()
export type ListTenantsInput = NonNullable<z.infer<typeof listTenantsInputSchema>>
```

- [ ] **Step 2: Export from the Zod barrel**

In `apps/server/src/schemas/index.ts` add:

```ts
export * from '../modules/tenants/schemas.js'
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @villuh/server exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/modules/tenants/schemas.ts apps/server/src/schemas/index.ts
git commit -m "feat(tenants): zod input schemas + sort keys"
```

### Task 4: Tenant + tenancy service with guards (TDD)

**Files:**
- Create: `apps/server/src/modules/tenants/service.ts`
- Create/append: `apps/server/src/__tests__/tenants.test.ts`

**Interfaces:**
- Consumes: `OrganizationTx` from `../../db/index.js`; `notFound`, `badRequest` from `../../domain/index.js`; filter helpers from `../../lib/filter-sql.js`; `resolveListQuery`, `runListQuery` from `../../lib/list-query.js`; schemas from `./schemas.js`.
- Produces:
  - `listTenants(tx, orgId, input?) => { tenants: TenantListItem[]; total: number }`
  - `getTenant(tx, orgId, tenantId) => TenantDetail`
  - `createTenant(tx, orgId, input) => TenantRow`
  - `updateTenant(tx, orgId, input) => TenantRow`
  - `archiveTenant(tx, orgId, tenantId) => TenantRow`
  - `createTenancy(tx, orgId, input) => TenancyRow`
  - `addCoTenant(tx, orgId, input) => TenancyMemberRow`
  - `removeMember(tx, orgId, input) => void`
  - `updateTenancy(tx, orgId, input) => TenancyRow`
  - `endTenancy(tx, orgId, tenancyId) => TenancyRow`
  - Types: `TenantRow`, `TenancyRow`, `TenantListItem` (`TenantRow & { currentUnit: { id, label } | null; tenancyStatus: 'pending'|'active'|'ended' | null }`), `TenantDetail`.

- [ ] **Step 1: Write failing tests** (mirror `floor-plans.test.ts` bootstrapping — a seeded org, `withOrganization(orgId, userId, …)`):

```ts
// apps/server/src/__tests__/tenants.test.ts (core cases)
import { describe, it, expect, beforeEach } from 'vitest'
import { withOrganization } from '../db/index.js'
import { createTenant, createTenancy, addCoTenant, removeMember, endTenancy, listTenants, getTenant, archiveTenant } from '../modules/tenants/service.js'
// ... reuse the suite's org/unit seed helpers (see floor-plans.test.ts) ...

describe('tenants service', () => {
  it('creates a tenant and lists it as Unassigned', async () => {
    await withOrganization(orgId, userId, async (tx) => {
      const t = await createTenant(tx, orgId, { firstName: 'Jane', lastName: 'Doe', email: 'jane@x.com' })
      const { tenants } = await listTenants(tx, orgId)
      const row = tenants.find((r) => r.id === t.id)!
      expect(row.currentUnit).toBeNull()
      expect(row.tenancyStatus).toBeNull()
    })
  })

  it('rejects a second active tenancy on the same unit', async () => {
    await withOrganization(orgId, userId, async (tx) => {
      const a = await createTenant(tx, orgId, { firstName: 'A', lastName: 'A', email: 'a@x.com' })
      const b = await createTenant(tx, orgId, { firstName: 'B', lastName: 'B', email: 'b@x.com' })
      await createTenancy(tx, orgId, { unitId, status: 'active', memberTenantIds: [a.id], primaryTenantId: a.id })
      await expect(
        createTenancy(tx, orgId, { unitId, status: 'active', memberTenantIds: [b.id], primaryTenantId: b.id }),
      ).rejects.toThrow(/active tenancy/i)
    })
  })

  it('supports co-tenants and blocks removing the primary', async () => {
    await withOrganization(orgId, userId, async (tx) => {
      const a = await createTenant(tx, orgId, { firstName: 'A', lastName: 'A', email: 'a2@x.com' })
      const b = await createTenant(tx, orgId, { firstName: 'B', lastName: 'B', email: 'b2@x.com' })
      const ten = await createTenancy(tx, orgId, { unitId, status: 'pending', memberTenantIds: [a.id], primaryTenantId: a.id })
      await addCoTenant(tx, orgId, { tenancyId: ten.id, tenantId: b.id })
      await expect(removeMember(tx, orgId, { tenancyId: ten.id, tenantId: a.id })).rejects.toThrow(/primary/i)
      await removeMember(tx, orgId, { tenancyId: ten.id, tenantId: b.id }) // co-tenant removal ok
    })
  })

  it('endTenancy sets ended + archivedAt and retains the row', async () => {
    await withOrganization(orgId, userId, async (tx) => {
      const a = await createTenant(tx, orgId, { firstName: 'A', lastName: 'A', email: 'a3@x.com' })
      const ten = await createTenancy(tx, orgId, { unitId, status: 'active', memberTenantIds: [a.id], primaryTenantId: a.id })
      const ended = await endTenancy(tx, orgId, ten.id)
      expect(ended.status).toBe('ended')
      expect(ended.archivedAt).not.toBeNull()
    })
  })

  it('rejects a cross-org unit and a primary not in members', async () => {
    await withOrganization(orgId, userId, async (tx) => {
      const a = await createTenant(tx, orgId, { firstName: 'A', lastName: 'A', email: 'a4@x.com' })
      await expect(
        createTenancy(tx, orgId, { unitId: crypto.randomUUID(), memberTenantIds: [a.id], primaryTenantId: a.id }),
      ).rejects.toThrow(/unit not found/i)
      await expect(
        createTenancy(tx, orgId, { unitId, memberTenantIds: [a.id], primaryTenantId: crypto.randomUUID() }),
      ).rejects.toThrow(/primary/i)
    })
  })
})
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `pnpm --filter @villuh/server exec vitest run src/__tests__/tenants.test.ts`
Expected: FAIL (`service.ts` has no exports yet).

- [ ] **Step 3: Implement `modules/tenants/service.ts`**

```ts
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import { tenants, tenancies, tenancyMembers } from '../../schema/tenants.js'
import { units } from '../../schema/units.js'
import { idFilter, listWhere, searchCondition } from '../../lib/filter-sql.js'
import { resolveListQuery, runListQuery } from '../../lib/list-query.js'
import { badRequest, notFound } from '../../domain/index.js'
import type { OrganizationTx } from '../../db/index.js'
import type {
  CreateTenantInput, UpdateTenantInput, ListTenantsInput,
  CreateTenancyInput, UpdateTenancyInput, AddCoTenantInput, RemoveMemberInput,
} from './schemas.js'

export type TenantRow = typeof tenants.$inferSelect
export type TenancyRow = typeof tenancies.$inferSelect
export type TenancyMemberRow = typeof tenancyMembers.$inferSelect

export type TenantListItem = TenantRow & {
  currentUnit: { id: string; label: string } | null
  tenancyStatus: TenancyRow['status'] | null
}

async function requireTenant(tx: OrganizationTx, organizationId: string, tenantId: string): Promise<TenantRow> {
  const [row] = await tx.select().from(tenants)
    .where(and(eq(tenants.id, tenantId), eq(tenants.organizationId, organizationId))).limit(1)
  if (!row) notFound('Tenant not found')
  return row
}

async function requireUnit(tx: OrganizationTx, organizationId: string, unitId: string): Promise<void> {
  const [row] = await tx.select({ id: units.id }).from(units)
    .where(and(eq(units.id, unitId), eq(units.organizationId, organizationId))).limit(1)
  if (!row) notFound('Unit not found')
}

async function requireTenancy(tx: OrganizationTx, organizationId: string, tenancyId: string): Promise<TenancyRow> {
  const [row] = await tx.select().from(tenancies)
    .where(and(eq(tenancies.id, tenancyId), eq(tenancies.organizationId, organizationId))).limit(1)
  if (!row) notFound('Tenancy not found')
  return row
}

/**
 * A tenant's "current" tenancy = the non-archived tenancy with the most relevant status.
 * active outranks pending; ended/archived are ignored. Encoded as a status rank so the
 * list read and the detail read agree. (TENT-01 status derivation.)
 */
const currentTenancyRank = sql`CASE ${tenancies.status} WHEN 'active' THEN 2 WHEN 'pending' THEN 1 ELSE 0 END`

const TENANT_SORT_COLUMNS = {
  name: tenants.lastName,
  email: tenants.email,
  currentUnit: units.label,
  status: tenancies.status,
} satisfies Record<NonNullable<ListTenantsInput['sortBy']>, PgColumn | ReturnType<typeof sql>>

export async function listTenants(
  tx: OrganizationTx, organizationId: string, input?: ListTenantsInput,
): Promise<{ tenants: TenantListItem[]; total: number }> {
  // Derive the current tenancy per tenant via the members join, keeping only the
  // highest-ranked non-archived tenancy. DISTINCT ON keeps one row per tenant.
  const where = listWhere(
    eq(tenants.organizationId, organizationId),
    isNull(tenants.archivedAt),
    idFilter(units.id, { include: input?.unitIds, exclude: input?.excludeUnitIds, empty: input?.unitEmpty }),
    input?.statusIn?.length ? inArray(tenancies.status, input.statusIn) : undefined,
    searchCondition(input?.search, [tenants.firstName, tenants.lastName, tenants.email]),
  )

  const { items, total } = await runListQuery({
    tx,
    query: resolveListQuery(input, { columns: TENANT_SORT_COLUMNS, tiebreaker: tenants.createdAt }),
    base: () =>
      tx.selectDistinctOn([tenants.id], {
        tenant: tenants,
        unitId: units.id,
        unitLabel: units.label,
        tenancyStatus: tenancies.status,
      })
        .from(tenants)
        .leftJoin(tenancyMembers, eq(tenancyMembers.tenantId, tenants.id))
        .leftJoin(
          tenancies,
          and(eq(tenancies.id, tenancyMembers.tenancyId), isNull(tenancies.archivedAt)),
        )
        .leftJoin(units, eq(units.id, tenancies.unitId))
        .where(where)
        .orderBy(tenants.id, sql`${currentTenancyRank} DESC`)
        .$dynamic(),
  })

  return {
    total,
    tenants: items.map((row) => ({
      ...row.tenant,
      currentUnit: row.unitId && row.unitLabel ? { id: row.unitId, label: row.unitLabel } : null,
      tenancyStatus: row.tenancyStatus ?? null,
    })),
  }
}

export type TenantDetail = {
  tenant: TenantRow
  tenancies: Array<TenancyRow & {
    unit: { id: string; label: string }
    members: Array<{ tenantId: string; firstName: string; lastName: string; isPrimary: boolean }>
  }>
}

export async function getTenant(tx: OrganizationTx, organizationId: string, tenantId: string): Promise<TenantDetail> {
  const tenant = await requireTenant(tx, organizationId, tenantId)

  const tenancyIds = (
    await tx.select({ tenancyId: tenancyMembers.tenancyId }).from(tenancyMembers)
      .where(and(eq(tenancyMembers.tenantId, tenantId), eq(tenancyMembers.organizationId, organizationId)))
  ).map((r) => r.tenancyId)

  if (tenancyIds.length === 0) return { tenant, tenancies: [] }

  const tenancyRows = await tx.select({ tenancy: tenancies, unitId: units.id, unitLabel: units.label })
    .from(tenancies).innerJoin(units, eq(units.id, tenancies.unitId))
    .where(and(inArray(tenancies.id, tenancyIds), eq(tenancies.organizationId, organizationId)))

  const memberRows = await tx.select({
    tenancyId: tenancyMembers.tenancyId, tenantId: tenancyMembers.tenantId,
    isPrimary: tenancyMembers.isPrimary, firstName: tenants.firstName, lastName: tenants.lastName,
  })
    .from(tenancyMembers).innerJoin(tenants, eq(tenants.id, tenancyMembers.tenantId))
    .where(and(inArray(tenancyMembers.tenancyId, tenancyIds), eq(tenancyMembers.organizationId, organizationId)))

  return {
    tenant,
    tenancies: tenancyRows.map((r) => ({
      ...r.tenancy,
      unit: { id: r.unitId, label: r.unitLabel },
      members: memberRows.filter((m) => m.tenancyId === r.tenancy.id)
        .map((m) => ({ tenantId: m.tenantId, firstName: m.firstName, lastName: m.lastName, isPrimary: m.isPrimary })),
    })),
  }
}

export async function createTenant(tx: OrganizationTx, organizationId: string, input: CreateTenantInput): Promise<TenantRow> {
  const [row] = await tx.insert(tenants).values({
    organizationId,
    firstName: input.firstName, lastName: input.lastName, email: input.email,
    phone: input.phone ?? null, notes: input.notes ?? null,
  }).returning()
  return row
}

export async function updateTenant(tx: OrganizationTx, organizationId: string, input: UpdateTenantInput): Promise<TenantRow> {
  const { tenantId, ...rest } = input
  await requireTenant(tx, organizationId, tenantId)
  const patch: Partial<typeof tenants.$inferInsert> = { updatedAt: new Date() }
  if (rest.firstName !== undefined) patch.firstName = rest.firstName
  if (rest.lastName !== undefined) patch.lastName = rest.lastName
  if (rest.email !== undefined) patch.email = rest.email
  if (rest.phone !== undefined) patch.phone = rest.phone ?? null
  if (rest.notes !== undefined) patch.notes = rest.notes ?? null
  const [row] = await tx.update(tenants).set(patch)
    .where(and(eq(tenants.id, tenantId), eq(tenants.organizationId, organizationId))).returning()
  return row
}

export async function archiveTenant(tx: OrganizationTx, organizationId: string, tenantId: string): Promise<TenantRow> {
  const existing = await requireTenant(tx, organizationId, tenantId)
  if (existing.archivedAt) return existing
  const now = new Date()
  const [row] = await tx.update(tenants).set({ archivedAt: now, updatedAt: now })
    .where(and(eq(tenants.id, tenantId), eq(tenants.organizationId, organizationId))).returning()
  return row
}

export async function createTenancy(tx: OrganizationTx, organizationId: string, input: CreateTenancyInput): Promise<TenancyRow> {
  await requireUnit(tx, organizationId, input.unitId)
  if (!input.memberTenantIds.includes(input.primaryTenantId)) badRequest('The primary tenant must be one of the members.')
  for (const id of input.memberTenantIds) await requireTenant(tx, organizationId, id)

  // App-level guard mirrors the DB partial index for a friendly error before hitting it.
  if (input.status === 'active') {
    const [clash] = await tx.select({ id: tenancies.id }).from(tenancies)
      .where(and(eq(tenancies.unitId, input.unitId), eq(tenancies.status, 'active'), isNull(tenancies.archivedAt))).limit(1)
    if (clash) badRequest('This unit already has an active tenancy.')
  }

  const [tenancy] = await tx.insert(tenancies).values({
    organizationId, unitId: input.unitId, status: input.status,
    startDate: input.startDate ?? null, endDate: input.endDate ?? null,
  }).returning()

  await tx.insert(tenancyMembers).values(
    input.memberTenantIds.map((tenantId) => ({
      organizationId, tenancyId: tenancy.id, tenantId, isPrimary: tenantId === input.primaryTenantId,
    })),
  )
  return tenancy
}

export async function addCoTenant(tx: OrganizationTx, organizationId: string, input: AddCoTenantInput): Promise<TenancyMemberRow> {
  await requireTenancy(tx, organizationId, input.tenancyId)
  await requireTenant(tx, organizationId, input.tenantId)
  const [row] = await tx.insert(tenancyMembers)
    .values({ organizationId, tenancyId: input.tenancyId, tenantId: input.tenantId, isPrimary: false })
    .onConflictDoNothing({ target: [tenancyMembers.tenancyId, tenancyMembers.tenantId] })
    .returning()
  if (!row) badRequest('That tenant is already on this tenancy.')
  return row
}

export async function removeMember(tx: OrganizationTx, organizationId: string, input: RemoveMemberInput): Promise<void> {
  await requireTenancy(tx, organizationId, input.tenancyId)
  const [member] = await tx.select().from(tenancyMembers)
    .where(and(
      eq(tenancyMembers.tenancyId, input.tenancyId),
      eq(tenancyMembers.tenantId, input.tenantId),
      eq(tenancyMembers.organizationId, organizationId),
    )).limit(1)
  if (!member) notFound('Member not found')
  if (member.isPrimary) badRequest('Promote another member to primary before removing this one.')
  await tx.delete(tenancyMembers)
    .where(and(eq(tenancyMembers.tenancyId, input.tenancyId), eq(tenancyMembers.tenantId, input.tenantId)))
}

export async function updateTenancy(tx: OrganizationTx, organizationId: string, input: UpdateTenancyInput): Promise<TenancyRow> {
  const existing = await requireTenancy(tx, organizationId, input.tenancyId)
  const patch: Partial<typeof tenancies.$inferInsert> = { updatedAt: new Date() }
  if (input.status !== undefined) patch.status = input.status
  if (input.startDate !== undefined) patch.startDate = input.startDate ?? null
  if (input.endDate !== undefined) patch.endDate = input.endDate ?? null

  if (input.status === 'active' && existing.status !== 'active') {
    const [clash] = await tx.select({ id: tenancies.id }).from(tenancies)
      .where(and(eq(tenancies.unitId, existing.unitId), eq(tenancies.status, 'active'), isNull(tenancies.archivedAt))).limit(1)
    if (clash) badRequest('This unit already has an active tenancy.')
  }
  const [row] = await tx.update(tenancies).set(patch)
    .where(and(eq(tenancies.id, input.tenancyId), eq(tenancies.organizationId, organizationId))).returning()
  return row
}

export async function endTenancy(tx: OrganizationTx, organizationId: string, tenancyId: string): Promise<TenancyRow> {
  const existing = await requireTenancy(tx, organizationId, tenancyId)
  if (existing.status === 'ended') return existing
  const now = new Date()
  const [row] = await tx.update(tenancies).set({ status: 'ended', archivedAt: now, updatedAt: now })
    .where(and(eq(tenancies.id, tenancyId), eq(tenancies.organizationId, organizationId))).returning()
  return row
}
```

> Note: if `selectDistinctOn`/`orderBy` composition fights `resolveListQuery`'s own ordering, fall back to a lateral/subquery that pre-selects the current tenancy per tenant, then join — keep the returned `TenantListItem` shape identical.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `pnpm --filter @villuh/server exec vitest run src/__tests__/tenants.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/tenants/service.ts apps/server/src/__tests__/tenants.test.ts
git commit -m "feat(tenants): tenant + tenancy service with guards (TDD)"
```

### Task 5: tRPC router + registration

**Files:**
- Create: `apps/server/src/modules/tenants/router.ts`
- Modify: `apps/server/src/router.ts`

**Interfaces:**
- Consumes: service fns from `./service.js`; schemas from `./schemas.js`; `protectedProcedure`, `permissionProcedure`, `router` from `../../trpc.js`; `withOrganization` from `../../db/index.js`.
- Produces: `tenantsRouter` mounted as `tenants` on `appRouter` → `trpc.tenants.*` on the client.

- [ ] **Step 1: Write `modules/tenants/router.ts`**

```ts
import { router, protectedProcedure, permissionProcedure } from '../../trpc.js'
import { withOrganization } from '../../db/index.js'
import {
  createTenantInputSchema, updateTenantInputSchema, tenantIdInputSchema, listTenantsInputSchema,
  createTenancyInputSchema, updateTenancyInputSchema, tenancyIdInputSchema, addCoTenantInputSchema, removeMemberInputSchema,
} from './schemas.js'
import {
  listTenants, getTenant, createTenant, updateTenant, archiveTenant,
  createTenancy, updateTenancy, endTenancy, addCoTenant, removeMember, getTenantActivity,
} from './service.js'
import { tenantActivityInputSchema } from './schemas.js' // added in Task 6

export const tenantsRouter = router({
  list: protectedProcedure.input(listTenantsInputSchema).query(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => listTenants(tx, ctx.organizationId, input))),

  get: protectedProcedure.input(tenantIdInputSchema).query(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => getTenant(tx, ctx.organizationId, input.tenantId))),

  activity: protectedProcedure.input(tenantActivityInputSchema).query(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => getTenantActivity(tx, ctx.organizationId, input))),

  create: permissionProcedure('write').input(createTenantInputSchema).mutation(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => createTenant(tx, ctx.organizationId, input)).then((tenant) => ({ tenant }))),

  update: permissionProcedure('write').input(updateTenantInputSchema).mutation(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => updateTenant(tx, ctx.organizationId, input)).then((tenant) => ({ tenant }))),

  archive: permissionProcedure('write').input(tenantIdInputSchema).mutation(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => archiveTenant(tx, ctx.organizationId, input.tenantId)).then((tenant) => ({ tenant }))),

  createTenancy: permissionProcedure('write').input(createTenancyInputSchema).mutation(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => createTenancy(tx, ctx.organizationId, input)).then((tenancy) => ({ tenancy }))),

  updateTenancy: permissionProcedure('write').input(updateTenancyInputSchema).mutation(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => updateTenancy(tx, ctx.organizationId, input)).then((tenancy) => ({ tenancy }))),

  endTenancy: permissionProcedure('write').input(tenancyIdInputSchema).mutation(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => endTenancy(tx, ctx.organizationId, input.tenancyId)).then((tenancy) => ({ tenancy }))),

  addCoTenant: permissionProcedure('write').input(addCoTenantInputSchema).mutation(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => addCoTenant(tx, ctx.organizationId, input)).then((member) => ({ member }))),

  removeMember: permissionProcedure('write').input(removeMemberInputSchema).mutation(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => removeMember(tx, ctx.organizationId, input)).then(() => ({ ok: true as const }))),
})
```

- [ ] **Step 2: Register on `appRouter`**

In `apps/server/src/router.ts`: add `import { tenantsRouter } from './modules/tenants/router.js'` and add `tenants: tenantsRouter,` to the `router({ … })` object.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @villuh/server exec tsc --noEmit`
Expected: PASS (will fail until Task 6 adds `getTenantActivity`/`tenantActivityInputSchema` — Task 6 runs in the same wave; if executing strictly sequentially, implement Task 6 before this typecheck, or temporarily omit the `activity` line and add it in Task 6).

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/modules/tenants/router.ts apps/server/src/router.ts
git commit -m "feat(tenants): tRPC router + appRouter registration"
```

### Task 6: Activity timeline (audit-derived, TDD)

**Files:**
- Modify: `apps/server/src/modules/tenants/schemas.ts` (add `tenantActivityInputSchema`)
- Modify: `apps/server/src/modules/tenants/service.ts` (add `getTenantActivity`)
- Append: `apps/server/src/__tests__/tenants.test.ts`

**Interfaces:**
- Produces: `tenantActivityInputSchema` (`{ tenantId: uuid, limit?: number, page?: number }`); `getTenantActivity(tx, orgId, input) => { entries: TenantActivityEntry[]; total: number }` where `TenantActivityEntry = { id, tableName, rowId, operation, actorId, createdAt }`.

- [ ] **Step 1: Add the input schema** to `schemas.ts`:

```ts
export const tenantActivityInputSchema = z.object({
  tenantId: z.uuid(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
})
export type TenantActivityInput = z.infer<typeof tenantActivityInputSchema>
```

- [ ] **Step 2: Write the failing test** (append to `tenants.test.ts`):

```ts
it('activity timeline surfaces tenant + tenancy + membership events from audit_log', async () => {
  await withOrganization(orgId, userId, async (tx) => {
    const t = await createTenant(tx, orgId, { firstName: 'Log', lastName: 'Ged', email: 'log@x.com' })
    await createTenancy(tx, orgId, { unitId, status: 'pending', memberTenantIds: [t.id], primaryTenantId: t.id })
    const { entries, total } = await getTenantActivity(tx, orgId, { tenantId: t.id, page: 1, limit: 50 })
    expect(total).toBeGreaterThanOrEqual(2) // tenant INSERT + membership INSERT (+ tenancy INSERT)
    expect(entries.some((e) => e.tableName === 'tenants' && e.operation === 'INSERT')).toBe(true)
    expect(entries.some((e) => e.tableName === 'tenancy_members')).toBe(true)
  })
})
```

- [ ] **Step 3: Run it, confirm it fails**

Run: `pnpm --filter @villuh/server exec vitest run src/__tests__/tenants.test.ts -t activity`
Expected: FAIL (`getTenantActivity` not defined).

- [ ] **Step 4: Implement `getTenantActivity`** in `service.ts`:

```ts
import type { TenantActivityInput } from './schemas.js'

export type TenantActivityEntry = {
  id: string; tableName: string; rowId: string; operation: string; actorId: string; createdAt: string
}

/**
 * Read-only timeline over the partitioned audit_log (RLS-scoped by org). We gather the
 * tenant's own row id plus its tenancy ids and membership ids, then select audit rows whose
 * (table_name, row_id) match. Future phases (doc views, logins) appear automatically once
 * their tables emit audit rows. No new write path (TENT-03).
 */
export async function getTenantActivity(
  tx: OrganizationTx, organizationId: string, input: TenantActivityInput,
): Promise<{ entries: TenantActivityEntry[]; total: number }> {
  await requireTenant(tx, organizationId, input.tenantId)

  const memberRows = await tx.select({ id: tenancyMembers.id, tenancyId: tenancyMembers.tenancyId })
    .from(tenancyMembers)
    .where(and(eq(tenancyMembers.tenantId, input.tenantId), eq(tenancyMembers.organizationId, organizationId)))

  const tenancyIds = memberRows.map((r) => r.tenancyId)
  const membershipIds = memberRows.map((r) => r.id)
  const rowIds = [input.tenantId, ...tenancyIds, ...membershipIds]

  const offset = (input.page - 1) * input.limit
  const idList = sql.join(rowIds.map((id) => sql`${id}::uuid`), sql`, `)

  const entries = await tx.execute(sql`
    SELECT id, table_name AS "tableName", row_id AS "rowId", operation, actor_id AS "actorId", created_at AS "createdAt"
    FROM audit_log
    WHERE table_name IN ('tenants','tenancies','tenancy_members')
      AND row_id IN (${idList})
    ORDER BY created_at DESC
    LIMIT ${input.limit} OFFSET ${offset}
  `) as unknown as TenantActivityEntry[]

  const totalRes = await tx.execute(sql`
    SELECT COUNT(*)::int AS c FROM audit_log
    WHERE table_name IN ('tenants','tenancies','tenancy_members') AND row_id IN (${idList})
  `) as unknown as { c: number }[]

  return { entries, total: totalRes[0]?.c ?? 0 }
}
```

- [ ] **Step 5: Run tests, confirm all pass**

Run: `pnpm --filter @villuh/server exec vitest run src/__tests__/tenants.test.ts`
Then re-run the Task 5 typecheck: `pnpm --filter @villuh/server exec tsc --noEmit`
Expected: PASS both.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/modules/tenants/service.ts apps/server/src/modules/tenants/schemas.ts apps/server/src/__tests__/tenants.test.ts
git commit -m "feat(tenants): audit-derived activity timeline (TDD)"
```

---

## WAVE 3 — Frontend

### Task 7: Table config + overlay registry

**Files:**
- Create: `apps/landlord-web/modules/tenants/lib/tenants.table.ts`
- Create: `apps/landlord-web/modules/tenants/lib/tenants.overlays.ts`

**Interfaces:**
- Produces: `tenantsTable` (a `defineTable("tenants", null, …)`); `tenantOverlays = createOverlays("tenant", { form: entity(TenantFormSheet), archive: entity(ArchiveTenantDialog), detail: entity(TenantDetailSheet) })`.
- Consumes: `defineTable`, `ids`, `idFilterOperators`, `createOverlays`, `entity` from `@villuh/ui`; `trpc` from `@villuh/api`.

- [ ] **Step 1: Write `tenants.table.ts`** (mirrors `units.table.ts`; a Unit filter + a Status filter):

```ts
"use client"
import { useMemo } from "react"
import { trpc } from "@villuh/api"
import { defineTable, ids, idFilterOperators } from "@villuh/ui"

type Option = { value: string; label: string }
const NO_OPTIONS: Option[] = []

export const tenantsTable = defineTable("tenants", null, {
  sortable: ["name", "email", "currentUnit", "status"],
  fields: {
    unit: ids({
      label: "Unit",
      icon: "IconDoor",
      searchable: true,
      className: "w-[220px]",
      operators: idFilterOperators({ nullable: true }),
      server: { kind: "ids", param: "unitIds", excludeParam: "excludeUnitIds", emptyParam: "unitEmpty" },
      useOptions: (hidden) => {
        const { data } = trpc.units.list.useQuery(hidden ? undefined : {}, { enabled: !hidden })
        return useMemo(
          () => data?.units?.map((u) => ({ value: u.id, label: u.label })) ?? NO_OPTIONS,
          [data?.units],
        )
      },
    }),
  },
})
```

> Status is a fixed enum, not an id-list. If a status chip is desired, add a `select`-style field per the `@villuh/ui` primitive that backs enum filters (mirror how another table filters a fixed enum); otherwise ship unit-only filtering for v1 and rely on the search box. Keep `sortable` as-is.

- [ ] **Step 2: Write `tenants.overlays.ts`** (mirrors `units.overlays.ts`):

```ts
import { createOverlays, entity } from "@villuh/ui"
import { TenantFormSheet } from "@/modules/tenants/components/form/tenant-form-sheet"
import { ArchiveTenantDialog } from "@/modules/tenants/components/archive-tenant-dialog"
import { TenantDetailSheet } from "@/modules/tenants/components/tenant/tenant-detail-sheet"

// URL keys: tenant.form, tenant.archive, tenant.detail (each carries a tenant id payload).
export const tenantOverlays = createOverlays("tenant", {
  form: entity(TenantFormSheet),
  archive: entity(ArchiveTenantDialog),
  detail: entity(TenantDetailSheet),
})
```

- [ ] **Step 3: Commit** (typecheck deferred until the referenced components exist in Tasks 8–10):

```bash
git add apps/landlord-web/modules/tenants/lib
git commit -m "feat(tenants): table config + overlay registry"
```

### Task 8: Tenants list + columns

**Files:**
- Create: `apps/landlord-web/modules/tenants/components/list/tenants-columns.tsx`
- Create: `apps/landlord-web/modules/tenants/components/list/index.tsx`

**Interfaces:**
- Consumes: `useDataTableQueryState`, `DataTable`, `Button`, `PlatformIcon`, `StatusBadge` from `@villuh/ui`; `trpc` from `@villuh/api`; `tenantsTable`, `tenantOverlays`; `createTenantsColumns`.
- Produces: `TenantsList` component; `createTenantsColumns({ onView, onEdit, onArchive })`.

- [ ] **Step 1: `tenants-columns.tsx`** — column defs for name (links to detail), email, phone, current unit, status badge, and a row actions menu (View / Edit / Archive). Mirror `units-columns.tsx` structure exactly (same `ColumnDef` shape, same DropdownMenu row actions). Row type:

```ts
export type TenantsTableRow = {
  id: string; firstName: string; lastName: string; email: string; phone: string | null
  currentUnit: { id: string; label: string } | null
  tenancyStatus: "pending" | "active" | "ended" | null
}
```

Status cell maps `tenancyStatus` → label: `active`→"Active", `pending`→"Pending", `null`→"Unassigned" (precedence already applied server-side).

- [ ] **Step 2: `index.tsx`** — mirror `units/components/list/index.tsx`:

```tsx
"use client"
import { useMemo } from "react"
import { trpc } from "@villuh/api"
import { Button, DataTable, PlatformIcon, useDataTableQueryState } from "@villuh/ui"
import { tenantOverlays } from "@/modules/tenants/lib/tenants.overlays"
import { tenantsTable } from "@/modules/tenants/lib/tenants.table"
import { createTenantsColumns } from "./tenants-columns"

export type TenantsListProps = { lockedUnitId?: string; filterDisplay?: "inline" | "compact" }
const HIDE_UNIT = ["unit"] as const
const HIDE_NOTHING = [] as const

export function TenantsList({ lockedUnitId, filterDisplay }: TenantsListProps) {
  const { form, archive, detail } = tenantOverlays.useGroup()
  const { query, setQuery, serverInput, filterFields } = useDataTableQueryState(tenantsTable, {
    hide: lockedUnitId ? HIDE_UNIT : HIDE_NOTHING,
  })
  const { data, isLoading } = trpc.tenants.list.useQuery({
    ...serverInput,
    ...(lockedUnitId ? { unitIds: [lockedUnitId] } : {}),
  })
  const columns = useMemo(
    () => createTenantsColumns({
      onView: (t) => detail.open(t.id),
      onEdit: (t) => form.open(t.id),
      onArchive: (t) => archive.open(t.id),
    }),
    [detail.open, form.open, archive.open],
  )
  return (
    <DataTable
      columns={columns} data={data?.tenants} total={data?.total} isLoading={isLoading}
      query={query} onQueryChange={setQuery} filterFields={filterFields} filterDisplay={filterDisplay}
      toolbarAction={
        <Button size="sm" onClick={() => form.open()}>
          <PlatformIcon icon="IconPlusSmall" size={16} data-icon="inline-start" /> Add tenant
        </Button>
      }
      searchPlaceholder="Search tenants..."
      empty={{ title: "No tenants yet", description: "Add a tenant, then assign them to a unit." }}
      emptyFiltered={{ title: "No matching tenants", description: "Try adjusting your search or filters." }}
    />
  )
}
export { createTenantsColumns, type TenantsTableRow } from "./tenants-columns"
```

- [ ] **Step 3: Commit** (build gate runs in Task 11 once the page + overlays mount):

```bash
git add apps/landlord-web/modules/tenants/components/list
git commit -m "feat(tenants): tenants list + columns"
```

### Task 9: Tenant form sheet + co-tenant picker + archive dialog

**Files:**
- Create: `apps/landlord-web/modules/tenants/components/form/tenant-form-sheet.tsx`
- Create: `apps/landlord-web/modules/tenants/components/form/co-tenant-picker.tsx`
- Create: `apps/landlord-web/modules/tenants/components/archive-tenant-dialog.tsx`

**Interfaces:**
- Consumes: `@tanstack/react-form`, `createTenantInputSchema`/`updateTenantInputSchema` from `@villuh/server/schemas/tenants`, `trpc` + `invalidateOnSuccess` from `@villuh/api`, sheet/dialog primitives from `@villuh/ui`, the `overlay` prop (an `entity` handle carrying an optional tenant id).
- Produces: `TenantFormSheet`, `CoTenantPicker`, `ArchiveTenantDialog` — each receiving `{ overlay }` per the `createOverlays` `entity` contract (see `unit-form-sheet.tsx`/`archive-unit-dialog.tsx` for the exact prop shape).

- [ ] **Step 1: `tenant-form-sheet.tsx`** — a Sheet with `@tanstack/react-form` bound to the shared Zod schema. Create mode (`overlay.id` undefined) calls `trpc.tenants.create`; edit mode preloads via `trpc.tenants.get` and calls `trpc.tenants.update`. Fields: first name, last name, email, phone, notes. An optional "Assign to unit" section (unit `Select` + `CoTenantPicker` + status select + start date) that, on submit in create mode, chains `trpc.tenants.createTenancy` after the tenant is created. `onSuccess` → `invalidateOnSuccess(utils, [(u) => u.tenants.list, (u) => u.tenants.get])` and `overlay.close()`. Mirror `unit-form-sheet.tsx` for the exact Sheet + form wiring, submit button, and error toast.

- [ ] **Step 2: `co-tenant-picker.tsx`** — a combobox over `trpc.tenants.list` results that selects existing tenants and offers "Create new tenant" inline (opens a nested minimal create using `trpc.tenants.create`, then adds the returned id to the selection). Emits `string[]` (member tenant ids) + a `primaryTenantId`. This satisfies decision #10 (no duplicate persons).

- [ ] **Step 3: `archive-tenant-dialog.tsx`** — mirror `archive-unit-dialog.tsx` verbatim in structure: a confirm `AlertDialog` calling `trpc.tenants.archive`, `invalidateOnSuccess(utils, [(u) => u.tenants.list])`, success toast "Tenant archived", `overlay.close()`.

- [ ] **Step 4: Typecheck the app**

Run: `pnpm --filter @villuh/landlord-web exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/landlord-web/modules/tenants/components/form apps/landlord-web/modules/tenants/components/archive-tenant-dialog.tsx
git commit -m "feat(tenants): tenant form sheet, co-tenant picker, archive dialog"
```

### Task 10: Tenant detail sheet (profile + co-tenants + tenancy history + timeline)

**Files:**
- Create: `apps/landlord-web/modules/tenants/components/tenant/tenant-detail-sheet.tsx`

**Interfaces:**
- Consumes: `trpc.tenants.get`, `trpc.tenants.activity`; Sheet + Tabs + StatusBadge from `@villuh/ui`; the `overlay` prop (entity handle with the tenant id).
- Produces: `TenantDetailSheet` — cold-loads from a pasted `?tenant.detail=<id>` URL.

- [ ] **Step 1: Implement the sheet** — a `Sheet` opened from `overlay`, `trpc.tenants.get.useQuery({ tenantId: overlay.id! }, { enabled: overlay.id != null })`. Body Tabs:
  - **Profile:** name, email, phone, notes.
  - **Tenancies:** list from `data.tenancies` — each shows unit label (link to unit), status badge, start/end dates, and members with a "Primary" marker.
  - **Activity:** `trpc.tenants.activity.useQuery({ tenantId })` → render each entry as a human line via a small local `describeEntry(entry)` mapper (e.g. `tenants/INSERT` → "Tenant profile created", `tenancy_members/INSERT` → "Added to a tenancy", `tenancies/UPDATE` → "Tenancy updated"), with a relative timestamp.
  Mirror the loading/empty treatment used in `unit-detail-tabs.tsx`.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @villuh/landlord-web exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/landlord-web/modules/tenants/components/tenant
git commit -m "feat(tenants): tenant detail sheet with tenancies + activity timeline"
```

### Task 11: Route page + global overlay mount

**Files:**
- Create: `apps/landlord-web/app/(app)/tenants/page.tsx`
- Modify: `apps/landlord-web/modules/app/components/app-overlays.tsx`

**Interfaces:**
- Consumes: `TenantsList`; `tenantOverlays`; the existing `<AppOverlays>` module aggregation.
- Produces: `/tenants` route (already in `ROUTES.tenants`); tenant overlays auto-mounted globally.

- [ ] **Step 1: `app/(app)/tenants/page.tsx`**

```tsx
import { TenantsList } from "@/modules/tenants/components/list"

export default function TenantsPage() {
  return <TenantsList />
}
```

- [ ] **Step 2: Register overlays** — in `modules/app/components/app-overlays.tsx`, add `tenantOverlays` to the modules array passed to `<AppOverlays modules={…}>` (follow exactly how `unitOverlays`/`propertyOverlays` are included there).

- [ ] **Step 3: Build gate**

Run: `pnpm --filter @villuh/landlord-web build`
Expected: PASS (RSC graph resolves; `/tenants` renders).

- [ ] **Step 4: Commit**

```bash
git add "apps/landlord-web/app/(app)/tenants/page.tsx" apps/landlord-web/modules/app/components/app-overlays.tsx
git commit -m "feat(tenants): /tenants page + global overlay mount"
```

### Task 12: Wire the two existing stub tabs to real data

**Files:**
- Modify: `apps/landlord-web/modules/properties/templates/property-tenants-template.tsx`
- Modify: `apps/landlord-web/modules/units/components/unit/unit-detail-tabs.tsx`

**Interfaces:**
- Consumes: `TenantsList` (property tab, scoped by the property's units) and `trpc.units.get`/a units-scoped tenant read for the unit tab.

- [ ] **Step 1: Property Tenants tab** — replace the stub body with a tenants view for the property. Since `tenants.list` filters by `unitIds`, fetch the property's units (`trpc.units.list.useQuery({ propertyIds: [propertyId] })`) and render `<TenantsList>` filtered to those unit ids (extend `TenantsList` with an optional `lockedUnitIds?: string[]` prop that maps to `unitIds`, defaulting to today's `lockedUnitId` behavior). Keep the empty state.

- [ ] **Step 2: Unit Tenant-history tab** — in `unit-detail-tabs.tsx`, replace the "Tenant history coming soon" block with a chronological list of that unit's tenancies (current active first, then ended) using `<TenantsList lockedUnitId={unit.id} />` or a compact list from `tenants.list?unitIds=[unit.id]`. Preserve the Overview/Rent-history tabs unchanged (Rent history stays a stub — out of this slice).

- [ ] **Step 3: Build gate**

Run: `pnpm --filter @villuh/landlord-web build`
Expected: PASS.

- [ ] **Step 4: Full server suite for tenants + app lint**

Run: `pnpm --filter @villuh/server exec vitest run src/__tests__/tenants.test.ts` then `pnpm --filter @villuh/landlord-web lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/landlord-web/modules/properties/templates/property-tenants-template.tsx apps/landlord-web/modules/units/components/unit/unit-detail-tabs.tsx
git commit -m "feat(tenants): wire property Tenants tab + unit Tenant-history tab to live data"
```

---

## Self-Review

**Spec coverage:**
- `TENT-01` (profiles + assigned unit + status) → Tasks 1, 3, 4 (create/update/list with derived unit+status), 8, 9.
- `TENT-02` (co-tenants) → `tenancy_members` (Task 1), `createTenancy`/`addCoTenant`/`removeMember` (Task 4), `CoTenantPicker` (Task 9).
- `TENT-03` (activity timeline) → Task 6 + detail Activity tab (Task 10).
- `TENT-04` (archive with retention) → soft-archive columns (Task 1), `archiveTenant`/`endTenancy` (Task 4), archive dialog (Task 9).
- Invariant (one active tenancy/unit) → partial index (Task 2) + app guard + test (Task 4).
- Occupancy derived, not written → `listTenants`/`getTenant` derive current unit; no `units` writes anywhere.
- Deferred items (leases, DocuSign, onboarding status, CSV import/export, `units.statusId` auto-write) → not present in any task. ✓

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". Two explicit fallbacks are flagged with concrete alternatives (list-query composition; enum-status filter primitive) rather than left vague.

**Type consistency:** `TenantListItem` (`currentUnit`, `tenancyStatus`) is produced in Task 4 and consumed by the same names in Tasks 8/12. `tenantOverlays` handles (`form`/`archive`/`detail`) declared in Task 7 match `useGroup()` destructuring in Task 8 and the component props in Tasks 9–10. `getTenantActivity`/`tenantActivityInputSchema` are declared in Task 6 and referenced by Task 5's router (call-order note included).

**Open risk carried forward:** the `listTenants` "current tenancy per tenant" query uses `selectDistinctOn` + rank ordering; Task 4 Step 3 documents the subquery fallback if it conflicts with `resolveListQuery` ordering — the returned shape is fixed either way.
