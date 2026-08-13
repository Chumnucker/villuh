# Tenant Slice — Design Spec

**Date:** 2026-08-13
**Status:** Draft (pending user review)
**Phase:** 4 (Tenants, Leases & Documents) — **tenant slice only**
**Requirements covered:** TENT-01, TENT-02, TENT-03, TENT-04

## Context

Phase 4 as roadmapped bundles three subsystems — tenant profiles, the lease entity, and
the DocuSign document lifecycle (19 requirements: `TENT-01–06` + `LEASE-01–13`). No
detailed planning artifacts exist yet (no `phases/04-*` directory). In the codebase there
is no tenant/lease schema; only stub "Tenants" / "Tenant history" tabs on the property and
unit detail pages, and a note in `units.ts` that "Phase 4 will auto-set Occupied when a
lease is active."

This spec deliberately **decomposes** Phase 4 and designs only the **tenant slice**: the
data core that leases, onboarding, rent, and comms all hang off. It is architected so the
Lease entity later **extends the tenancy row** rather than forcing a migration.

## Scope

**In scope (this slice):**
- `TENT-01` — create/edit tenant profiles (name, email, phone, assigned unit, status)
- `TENT-02` — multiple co-tenants grouped together
- `TENT-03` — per-tenant activity timeline
- `TENT-04` — archive tenant/tenancy as inactive with full data retention

**Out of scope (own design passes later):**
- Lease entity, activation modes, addendums, mid-lease rent changes (`LEASE-*`)
- DocuSign / document lifecycle (`LEASE-03/06/07/08/09/10/11/12/13`)
- Onboarding status + magic-link invite (Phase 5)
- Automatic `units.statusId = Occupied` write (deferred to lease phase per `units.ts`)
- CSV import (`TENT-05`), full data export (`TENT-06`)
- Rent ledger (`LEDG-*`)

## Core architecture decision: the tenancy seam

A tenant is modeled as a **person record** separate from the **occupancy grouping** that
links people to a unit. This is the load-bearing decision:

- Co-tenants (`TENT-02`) are multiple people on one grouping row.
- A person can recur across grouping rows over time (re-rentals, unit tenant-history / `UNIT-04`).
- The future **Lease** entity becomes/extends the grouping row — no re-plumbing of the
  tenant↔unit relationship.

## Data model (3 new tables)

All tables follow existing conventions: `uuid` PK `defaultRandom()`, `organization_id`
`text` FK → `organization.id` `ON DELETE cascade`, the `organization_isolation` RLS policy
(`current_setting('app.current_organization_id', true)`), `enableRLS()`, `archivedAt` soft
delete, integer cents where money applies, and **hand-appended audit triggers** in the
migration (D-21).

### `tenants` — reusable person record
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `organizationId` | text FK → organization, cascade | RLS |
| `firstName` | text NOT NULL | structured for co-tenant lists, sorting, future DocuSign signer fields |
| `lastName` | text NOT NULL | |
| `email` | text NOT NULL | **not** uniquely constrained (couples share emails; DocuSign uses per-signer emails). Soft duplicate warning in UI. |
| `phone` | text NULL | |
| `notes` | text NULL | |
| `archivedAt` | timestamptz NULL | soft archive |
| `createdAt` / `updatedAt` | timestamptz | |

*Not added now:* `onboardingStatus` (Phase 5), any lease-status column (derived instead).

### `tenancies` — occupancy grouping (Lease extends this later)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `organizationId` | text FK → organization, cascade | RLS |
| `unitId` | uuid FK → units, cascade | NOT NULL |
| `status` | `tenancy_status` enum | `pending` \| `active` \| `ended` |
| `startDate` | `date` NULL | **`date` type**, not timestamptz (lease-style dates rule) |
| `endDate` | `date` NULL | |
| `archivedAt` | timestamptz NULL | set with `status='ended'` |
| `createdAt` / `updatedAt` | timestamptz | |

**New Postgres enum** `tenancy_status` added to `apps/server/src/schema/enums.ts`, built
from an `as const` array `['pending','active','ended']` (same pattern as tags/statuses),
with an accompanying migration.

**Partial unique index (invariant):**
`CREATE UNIQUE INDEX ... ON tenancies (unit_id) WHERE status = 'active' AND archived_at IS NULL;`
— at most one active tenancy per unit. Co-tenants are unaffected (they share one tenancy).

### `tenancy_members` — co-tenant join
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `organizationId` | text FK → organization, cascade | RLS |
| `tenancyId` | uuid FK → tenancies, cascade | |
| `tenantId` | uuid FK → tenants, cascade | |
| `isPrimary` | boolean NOT NULL default false | exactly one primary per tenancy |
| `createdAt` | timestamptz | |
| — | unique `(tenancyId, tenantId)` | no duplicate membership |

## Lifecycle & occupancy

- **Tenancy lifecycle:** `pending` (person created / being onboarded, not yet occupying) →
  `active` (moved in) → `ended` (soft-archived, data retained).
- **Occupancy is derived, never written** in this slice. A unit reads as occupied when it
  has an `active` tenancy. The `units.statusId = Occupied` write stays deferred to the lease
  phase (matches the existing `units.ts` note) — this slice adds no write coupling into units.
- **Archive = retention (`TENT-04`):** ending a tenancy sets `status='ended'` + `archivedAt`
  (Phase 3 soft-archive pattern). Archiving a tenant soft-archives the person and leaves
  historical tenancies intact.

## Activity timeline (`TENT-03`) — audit-derived (validated)

The timeline is a **read-only query over the existing `audit_log`** — no new write path.

Validated against the live schema: `audit_log` carries `organization_id`, `table_name`,
`row_id` (uuid), `operation`, `old_values`/`new_values` (JSONB), `actor_id`, `created_at`;
it is monthly-partitioned and RLS-scoped by `app.current_organization_id`. The shared
`audit_log_trigger_fn()` reads the org from the session GUC, so any table with a uuid `id`
works — the three tenant tables only need `CREATE TRIGGER ... EXECUTE FUNCTION
audit_log_trigger_fn();` appended to the migration (identical to the floor-plans convention
in `0017_floor_plans.sql`).

- **Query:** `WHERE table_name IN ('tenants','tenancies','tenancy_members') AND row_id IN
  (<tenant id> ∪ <the tenant's tenancy ids> ∪ <the tenant's membership ids>)`, ordered by
  `created_at DESC`. (Note: the existing `audit-log` router filters by `actor_id` for the
  personal SETT-02 log; the tenant timeline filters by `table_name`/`row_id` instead.)
- A thin presentation mapper turns each row into a human-readable entry.
- Future phases (document views, tenant logins) appear automatically once those tables emit
  audit rows — no timeline changes required.

## Server / API (tRPC + Zod)

New `tenants` tRPC router mirroring the `units` router; every procedure wrapped in
`withOrganization(organizationId, userId, fn)`. Shared Zod schemas at
`@villuh/server/schemas/tenants` (barrel-exported), reused by the frontend forms.

- **Tenant CRUD:** `tenants.list` (paginated/filterable read model), `tenants.get`
  (detail), `tenants.create`, `tenants.update`, `tenants.archive`.
- **Tenancy ops:** `tenants.createTenancy` (assign one or more people to a unit → tenancy +
  members, one `isPrimary`), `tenants.addCoTenant`, `tenants.updateTenancy` (status
  transitions + dates), `tenants.endTenancy` (`ended` + `archivedAt`).
- **Activity:** `tenants.activity` — the audit-derived read above.
- **Guards:** removing/archiving the primary member is blocked unless another member is
  promoted first; archiving a unit/property with an `active` tenancy is blocked with a clear
  message ("end the active tenancy first").
- **Invalidation:** mutations `invalidateOnSuccess` the tenant list/detail and the affected
  unit's tenant-history read.

## Frontend (`modules/tenants/`)

New module mirroring `modules/units/`:
- **List** at `/tenants` — a `defineTable` table (name, email, phone, current unit, derived
  status) with filter/sort/pagination in the URL (Phase 3.1 primitives).
- **Detail** — a URL-backed `createOverlays` sheet (cold-loads from a pasted link): profile,
  co-tenants, tenancy history, activity timeline.
- **Forms** — `@tanstack/react-form` + the shared Zod schemas: tenant create/edit, and an
  "assign to unit" flow that adds co-tenants in one pass. Co-tenant selection uses a combobox
  that picks **existing** people or creates a **new** one inline (avoids duplicate persons).
- **Archive dialog** — reuses the Phase 3 archive-confirm pattern.
- **Wire the existing stubs to real data:** the property **Tenants tab**
  (`property-tenants-template.tsx`) and the unit **Tenant-history tab**
  (`unit-detail-tabs.tsx`), both fed by the derived read models.

## Gray-area decisions (locked defaults)

1. `email` required; `phone` optional; email **not** uniquely constrained — soft duplicate warning only.
2. Tenant list status derivation precedence: `active` → `pending` → **"Unassigned."**
3. A tenant **may** hold multiple active tenancies (single-active invariant is per *unit*, not per *tenant*).
4. A tenant **may** exist with no tenancy; a `pending` tenancy still requires a `unitId`.
5. Removing/archiving the primary co-tenant is **blocked** until another member is promoted.
6. Archiving a unit/property with an active tenancy is **blocked**.
7. **Permissions reuse the existing coarse `write` category** (corrected after reading the code):
   the permission system uses four `ACTION_CATEGORIES` (`write`/`financial`/`communications`/`admin`)
   via `permissionProcedure('write')`, not per-resource keys. Tenant reads use `protectedProcedure`;
   tenant create/update/archive use `permissionProcedure('write')` — identical to the units router.
   **No new permission keys and no `role_permissions` migration.**
8. Tenants do **not** affect plan limits or per-unit billing (billing is per active unit).
9. Timeline is **purely audit-derived** — validated, no dedicated events table needed.
10. Co-tenant assignment uses a "select existing or create new" combobox.

## Cross-cutting / operational notes

- **Audit partitions:** `audit_log` partitions currently cover through 2026-12
  (`0014_audit_log_partitions_2026h2.sql`). Pre-creating future partitions remains an
  existing deferred operational gap (not introduced by this slice).
- **Shell contract:** this work is on Linux bash (per Phase 03.2 precedent), not the Windows
  PowerShell 5.1 of D-49/D-50.

## How the Lease phase bolts on later (forward-compatibility)

- The `tenancies` row is the seam: the Lease entity adds columns (rent amount, due day,
  grace period, activation mode) to this row — or a `leases` table 1:1 with it — without
  touching the tenant↔unit relationship or `tenancy_members`.
- The deferred `units.statusId = Occupied` auto-write lands in the lease phase, reading the
  same "active tenancy exists" signal this slice derives.
- `onboardingStatus` and the magic-link invite attach to the tenant/tenancy in Phase 5.
