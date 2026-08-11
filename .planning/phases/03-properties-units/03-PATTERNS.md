# Phase 3: Properties & Units - Pattern Map

**Mapped:** 2026-08-11
**Files analyzed:** 42
**Analogs found:** 38 / 42

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/server/src/schema/properties.ts` | model | CRUD | `apps/server/src/schema/role-permissions.ts` | exact |
| `apps/server/src/schema/units.ts` | model | CRUD | `apps/server/src/schema/role-permissions.ts` | exact |
| `apps/server/src/schema/tags.ts` | model | CRUD | `apps/server/src/schema/role-permissions.ts` | exact |
| `apps/server/src/schema/index.ts` | config | transform | `apps/server/src/schema/index.ts` | exact |
| `apps/server/migrations/00XX_properties_units.sql` | migration | batch | `apps/server/migrations/0005_audit_triggers.sql` | role-match |
| `apps/server/src/modules/properties/schemas.ts` | utility | request-response | `apps/server/src/modules/account/schemas.ts` | exact |
| `apps/server/src/modules/properties/router.ts` | controller | CRUD | `apps/server/src/modules/members/router.ts` + `permissions/router.ts` | exact |
| `apps/server/src/modules/properties/service.ts` | service | CRUD | `apps/server/src/modules/permissions/service.ts` | role-match |
| `apps/server/src/modules/units/schemas.ts` | utility | request-response | `apps/server/src/modules/account/schemas.ts` | exact |
| `apps/server/src/modules/units/router.ts` | controller | CRUD | `apps/server/src/modules/members/router.ts` | exact |
| `apps/server/src/modules/units/service.ts` | service | CRUD | `apps/server/src/modules/billing/router.ts` (`syncUnits`) | role-match |
| `apps/server/src/modules/tags/schemas.ts` | utility | request-response | `apps/server/src/modules/members/schemas.ts` | exact |
| `apps/server/src/modules/tags/router.ts` | controller | CRUD | `apps/server/src/modules/permissions/router.ts` | exact |
| `apps/server/src/modules/unit-statuses/schemas.ts` | utility | request-response | `apps/server/src/modules/permissions/schemas.ts` | exact |
| `apps/server/src/modules/unit-statuses/router.ts` | controller | CRUD | `apps/server/src/modules/permissions/router.ts` | exact |
| `apps/server/src/modules/uploads/schemas.ts` | utility | request-response | `apps/server/src/modules/billing/schemas.ts` | role-match |
| `apps/server/src/modules/uploads/router.ts` | controller | file-I/O | — (new; RESEARCH Pattern 4) | none |
| `apps/server/src/modules/uploads/s3.ts` | utility | file-I/O | — (new AWS SDK) | none |
| `apps/server/src/lib/sanitize-notes.ts` | utility | transform | — (new `sanitize-html`) | none |
| `apps/server/src/domain/plan-limit.ts` | utility | request-response | `apps/server/src/modules/members/router.ts` (inline) | exact |
| `apps/server/src/modules/me/router.ts` | controller | request-response | self (wire real counts) | exact |
| `apps/server/src/router.ts` | config | request-response | self (register routers) | exact |
| `apps/server/package.json` | config | transform | self (`./schemas/*` exports) | exact |
| `apps/server/src/__tests__/properties.test.ts` | test | CRUD | `apps/server/src/__tests__/org.test.ts` | role-match |
| `apps/server/src/__tests__/units.test.ts` | test | CRUD | `apps/server/src/__tests__/org.test.ts` | role-match |
| `apps/server/src/__tests__/tags.test.ts` | test | CRUD | `apps/server/src/__tests__/permissions.test.ts` | role-match |
| `apps/server/src/__tests__/unit-statuses.test.ts` | test | CRUD | `apps/server/src/__tests__/permissions.test.ts` | role-match |
| `apps/server/src/__tests__/gallery.test.ts` | test | file-I/O | `apps/server/src/__tests__/billing.test.ts` (mock externals) | partial |
| `apps/server/src/__tests__/plan-limit.test.ts` | test | request-response | self (replace TODOs) | exact |
| `apps/landlord-web/app/routes.ts` | config | request-response | self (extend ROUTES) | exact |
| `apps/landlord-web/app/(app)/properties/**` | route | CRUD | `apps/landlord-web/app/(app)/settings/page.tsx` | role-match |
| `apps/landlord-web/app/(app)/units/**` | route | CRUD | `apps/landlord-web/app/(app)/settings/page.tsx` | role-match |
| `apps/landlord-web/modules/app/components/properties/*` | component | CRUD | `profile-settings-form.tsx` | exact |
| `apps/landlord-web/modules/app/components/units/*` | component | CRUD | `profile-settings-form.tsx` + `@villuh/ui` Sheet | role-match |
| `apps/landlord-web/modules/app/components/tags/*` | component | CRUD | `profile-settings-form.tsx` + Dialog | role-match |
| `apps/landlord-web/modules/app/components/plan-limit/*` | component | request-response | `me-provider.tsx` (quota) + `dialog.tsx` | role-match |
| `AddressFields` / `NotesEditor` / `PropertyGallery` | component | request-response / file-I/O | — (Mapbox/TipTap/dnd-kit new) | none |
| `packages/ui` tabs | config | request-response | existing shadcn install in `@villuh/ui` | role-match |
| `.env.example` | config | transform | existing `.env.example` | exact |

## Pattern Assignments

### `apps/server/src/schema/properties.ts` / `units.ts` / `tags.ts` (model, CRUD)

**Analog:** `apps/server/src/schema/role-permissions.ts` (+ demo `rls.ts`)

**Imports + org FK + RLS policy** (role-permissions.ts lines 1–27):
```typescript
import { sql } from 'drizzle-orm'
import { pgPolicy, pgTable, text, uuid, boolean, timestamp, unique } from 'drizzle-orm/pg-core'
import { villuhApp } from './rls.js'
import { organization } from './auth.js'

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  // ...columns
}, (t) => [
  unique('role_permissions_org_role_action_unique').on(t.organizationId, t.role, t.action),
  pgPolicy('organization_isolation', {
    as: 'permissive',
    for: 'all',
    to: villuhApp,
    using: sql`organization_id = current_setting('app.current_organization_id', true)`,
    withCheck: sql`organization_id = current_setting('app.current_organization_id', true)`,
  }),
]).enableRLS()
```

**Copy for Phase 3:** Same `organizationId` FK + `organization_isolation` policy + `.enableRLS()` on `properties`, `property_images`, `units`, `unit_statuses`, `organization_tag`, `property_tag`. Soft-archive: add `archivedAt: timestamp('archived_at', { withTimezone: true })` (nullable) — no existing soft-delete column; RESEARCH A2.

**Export barrel** — `schema/index.ts`:
```typescript
export * from './rls.js'
export * from './auth.js'
export * from './role-permissions.js'
export * from './billing-plans.js'
export * from './plan-limits.js'
// + export * from './properties.js' | './units.js' | './tags.js'
```

---

### Migration audit triggers (migration, batch)

**Analog:** `apps/server/migrations/0005_audit_triggers.sql`

```sql
CREATE TRIGGER role_permissions_audit
  AFTER INSERT OR UPDATE OR DELETE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
```

**Copy for Phase 3:** One `CREATE TRIGGER …_audit` per new org-scoped table. Trigger reads `app.current_organization_id` (post-0011). Do not invent a new audit function.

---

### `apps/server/src/modules/*/schemas.ts` (utility, request-response)

**Analog:** `apps/server/src/modules/account/schemas.ts`

```typescript
import { z } from 'zod'

/** Shared by tRPC `account.updateProfile` and landlord settings form. */
export const updateProfileInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Display name is required')
    .max(120, 'Display name must be at most 120 characters'),
})

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>
```

**Package export pattern** (`apps/server/package.json`):
```json
"./schemas/account": "./src/modules/account/schemas.ts",
"./schemas/members": "./src/modules/members/schemas.ts"
```
Add `./schemas/properties`, `./schemas/units`, `./schemas/tags`, `./schemas/unit-statuses`, `./schemas/uploads`.

---

### `apps/server/src/modules/properties/router.ts` & `units/router.ts` (controller, CRUD)

**Analog A — plan limit + permissionProcedure:** `apps/server/src/modules/members/router.ts`

**Imports** (lines 1–13):
```typescript
import { router, protectedProcedure, permissionProcedure } from '../../trpc.js'
import { planLimits } from '../../schema/plan-limits.js'
import { organization } from '../../schema/auth.js'
import { withOrganization } from '../../db/index.js'
import { forbidden } from '../../domain/index.js'
import { resolveLimitsTier } from '../billing/plans.js'
import { sql, eq } from 'drizzle-orm'
```

**Plan-limit core** (lines 43–79) — extract to `domain/plan-limit.ts`, reuse on `properties.create` / `units.create`:
```typescript
createInvitation: permissionProcedure('admin')
  .input(createInvitationInputSchema)
  .mutation(async ({ ctx, input }) => {
    const { organizationId, userId } = ctx
    await withOrganization(organizationId, userId, async (tx) => {
      // COUNT active resources (archived_at IS NULL for portfolio)
      // load plan_limits for resolveLimitsTier(tier) + resource
      if (limit !== -1 && totalMembers >= limit) {
        forbidden('Member plan limit reached', 'PLAN_LIMIT', {
          resource: 'members',
          limit,
          current: totalMembers,
          upgrade_to: tier === 'starter' ? 'growth' : 'pro',
        })
      }
    })
    // ...side effect outside or after check
  }),
```

**Analog B — Drizzle CRUD inside withOrganization:** `apps/server/src/modules/permissions/router.ts`

```typescript
export const rolePermissionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { organizationId, userId } = ctx
    return withOrganization(organizationId, userId, async (tx) => {
      const rows = await tx
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.organizationId, organizationId))
      return { permissions: rows }
    })
  }),

  update: permissionProcedure('admin')
    .input(updateRolePermissionInputSchema)
    .mutation(async ({ ctx, input }) => {
      await withOrganization(organizationId, userId, async (tx) => {
        await tx.insert(rolePermissions).values({...}).onConflictDoUpdate({...})
      })
      return { ok: true }
    }),
})
```

**Permission mapping for Phase 3:**
| Action | Procedure |
|--------|-----------|
| properties/units/tags CRUD, gallery, promote tag | `permissionProcedure('write')` |
| unit status catalog mutate | `permissionProcedure('admin')` (D-27) |
| list/get | `protectedProcedure` (member of org) |

---

### `apps/server/src/domain/plan-limit.ts` (utility, request-response)

**Analog:** Inline block in `members/router.ts` lines 49–79 + `plan-limits.ts` + `domain/billing.ts`

**PlanResource already defined** (`domain/billing.ts` lines 22–23):
```typescript
export const PLAN_RESOURCES = ['units', 'properties', 'members'] as const
export type PlanResource = (typeof PLAN_RESOURCES)[number]
```

**Error throw shape** (`domain/errors.ts` lines 49–51):
```typescript
export function forbidden(message = 'Forbidden', appCode?: AppErrorCode, meta?: Record<string, unknown>): never {
  throwAppError({ code: 'FORBIDDEN', message, appCode, meta })
}
```

**Client check:** `error.data.appCode === 'PLAN_LIMIT'` (NOT HTTP 402) — see `trpc.ts` errorFormatter lines 8–22.

---

### Soft-archive cascade (service, CRUD)

**Analog:** `withOrganization` transaction (`db/organization.ts`) — no soft-delete analog exists; invent on this base.

```typescript
export async function withOrganization<T>(
  organizationId: string,
  actorId: string = 'system',
  fn: (tx: OrganizationTx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_organization_id', ${organizationId}, TRUE)`)
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${actorId}, TRUE)`)
    return fn(tx)
  })
}
```

**Copy:** Property archive = single `withOrganization` tx: set `archived_at` on property, then all child units. Stripe sync **after** commit with active unit count.

---

### Stripe unit quantity sync (service, CRUD)

**Analog:** `apps/server/src/modules/billing/router.ts` lines 206–222

```typescript
syncUnits: permissionProcedure('write')
  .input(syncUnitsInputSchema)
  .mutation(async ({ ctx, input }) => {
    const { organizationId } = ctx
    const { unitCount } = input
    const existing = await getOrgSubscription(organizationId)
    if (!existing?.stripe_subscription_id || !existing?.stripe_subscription_item_id) {
      return { ok: true, skipped: true, reason: 'no_subscription' }
    }
    const sub = await stripeClient.subscriptions.update(existing.stripe_subscription_id, {
      items: [{ id: existing.stripe_subscription_item_id, quantity: unitCount }],
      proration_behavior: 'create_prorations',
    })
    return { ok: true, quantity: unitCount, status: sub.status }
  }),
```

**Copy:** Extract shared `syncOrgUnitQuantity(orgId, unitCount)` used by `units.create` / `units.archive` / property cascade archive — **do not** tRPC-call-tRPC. Skip when `skipped: true`.

---

### `apps/server/src/modules/me/router.ts` (modify — real quota counts)

**Analog:** self, lines 26–59

```typescript
const counts = { units: 0, properties: 0, members: memberCountRows[0]?.c ?? 0 }
// ...
quota: {
  units: { count: counts.units, limit: limits['units'] ?? 5 },
  properties: { count: counts.properties, limit: limits['properties'] ?? 1 },
  members: { count: counts.members, limit: limits['members'] ?? 2 },
},
```

**Copy:** Replace stub `0` with `COUNT(*) … WHERE organization_id = $1 AND archived_at IS NULL`. Reuse same helpers as plan-limit checks. Pass `tx` into helpers — avoid nested `withOrganization` (comment line 36).

---

### `apps/server/src/router.ts` (config)

**Analog:** self

```typescript
export const appRouter = router({
  me: meRouter,
  members: membersRouter,
  rolePermissions: rolePermissionsRouter,
  account: accountRouter,
  auditLog: auditLogRouter,
  billing: billingRouter,
  // + properties, units, tags, unitStatuses, uploads
})
```

---

### `apps/server/src/modules/uploads/*` + `sanitize-notes.ts` (file-I/O / transform)

**No close codebase analog.** Follow RESEARCH Pattern 4 + Code Examples:

1. `uploads.presignPropertyImage` → `{ uploadUrl, objectKey }`
2. Client `fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type' } })`
3. `properties.gallery.add({ propertyId, objectKey })`
4. Reads return short-lived GET URLs; DB stores `objectKey` only
5. Key path: `{organizationId}/properties/{propertyId}/gallery/{uuid}.{ext}`

Sanitize via RESEARCH `sanitizeNotesHtml` allowlist (D-14/D-15).

---

### Landlord forms: property/unit (component, CRUD)

**Analog:** `apps/landlord-web/modules/app/components/settings/profile-settings-form.tsx`

**Imports + mutation + invalidate** (lines 1–40):
```typescript
"use client"

import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"
import { Button, Field, FieldError, FieldLabel, Input } from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { updateProfileInputSchema } from "@villuh/server/schemas/account"
import { useUser } from "@/modules/app/providers/me-provider"

const updateProfile = trpc.account.updateProfile.useMutation({
  onSuccess: async () => {
    await invalidateQueries(utils, [(u) => u.me.get])
    toast.success("Profile updated")
  },
  onError: (err) => {
    toast.error(err.message || "Could not update profile")
  },
})

const form = useForm({
  defaultValues: { name: me.user.name },
  validators: { onSubmit: updateProfileInputSchema },
  onSubmit: async ({ value }) => {
    const parsed = updateProfileInputSchema.parse(value)
    await updateProfile.mutateAsync(parsed)
    form.reset(parsed)
  },
})
```

**Invalidate helper** (`packages/api/src/invalidate.ts` lines 17–44):
```typescript
// Prefer invalidateQueries when toast/redirect also needed:
onSuccess: async () => {
  await invalidateQueries(utils, [
    (u) => u.properties.list,
    (u) => u.me.get, // quotas
  ])
  toast.success("Property created")
}
```

**Copy for Phase 3 creates/archives:** Always invalidate domain list/detail **and** `me.get` when counts change (D-43).

---

### App pages / layout (route, CRUD)

**Analog:** `apps/landlord-web/app/(app)/settings/page.tsx` + `layout.tsx`

**Auth shell** (layout.tsx):
```typescript
async function AuthedApp({ children }: { children: React.ReactNode }) {
  const me = await requireMe(ROUTES.auth.login)
  return (
    <UserProvider initialUser={me}>
      <LayoutTemplate>{children}</LayoutTemplate>
    </UserProvider>
  )
}
```

**Page chrome** (settings/page.tsx):
```typescript
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-medium tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account profile.</p>
      </div>
      <ProfileSettingsForm />
    </div>
  )
}
```

**Routes already reserved** (`routes.ts` / `sidebar-nav.ts`): `ROUTES.properties`, `ROUTES.units` + Manage sidebar items. Extend with `propertyNew`, `propertyDetail`, `propertyEdit`, `unitDetail` per UI-SPEC.

---

### PlanLimitGate + LimitReachedDialog (component, request-response)

**Analog:** Quota source `me-provider.tsx` + Dialog chrome `packages/ui/src/dialog.tsx`

**Quota from early-loaded me** (`me-provider.tsx` lines 15–46):
```typescript
export type Me = RouterOutput["me"]["get"]
const { data: user } = trpc.me.get.useQuery(undefined, {
  retry: false,
  initialData: initialUser,
})
// Gate reads: user.org.quota.properties | .units → { count, limit }
```

**Dialog shell** (`dialog.tsx` lines 50–66): `DialogContent` default `sm:max-w-md`, `rounded-4xl`. Archive property may use `sm:max-w-lg`.

**No existing PlanLimitGate** — new component wrapping create triggers; on click if `limit !== -1 && count >= limit` open LimitReachedDialog instead of navigate/Sheet. Also handle mutation `error.data.appCode === 'PLAN_LIMIT'` race.

CTA: primary → `ROUTES.billing` ("View billing plans").

---

### Unit Sheet / Archive Dialogs (component, request-response)

**Analog:** `packages/ui/src/sheet.tsx` (unit create/edit), `packages/ui/src/dialog.tsx` (archive / delete tag / remove photo)

Sheet: side `right`, width `sm:max-w-md` (UI-SPEC). No landlord Sheet usage yet — first consumer copies Sheet primitives + profile-form field pattern.

Badge for StatusBadge: `packages/ui/src/badge.tsx` + leading `PlatformIcon` 12px (UI-SPEC D-29). Color fills are soft palette keys — not Badge `default` primary.

---

### Tests (test, CRUD)

**Analog:** `apps/server/src/__tests__/org.test.ts` + `setup.ts` (`createOwnerClient`, `signUpTestUser`, `signInTestUser`, set-active org)

**Stub to replace:** `plan-limit.test.ts` currently `expect.fail('TODO…')` — implement properties/units cases mirroring members PLAN_LIMIT path in org.test.ts (~line 63).

Mock S3 like billing mocks Stripe/email — `vi.mock` client in gallery tests.

---

## Shared Patterns

### Authentication / org context
**Source:** `apps/server/src/trpc.ts` + `apps/server/src/db/organization.ts`  
**Apply to:** All portfolio procedures

```typescript
export const protectedProcedure = t.procedure.use(withAuth)
export function permissionProcedure(action: ActionCategory) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    // getActiveMember → isAllowed(org, role, action) → forbidden if not
    return next()
  })
}

// Every org-scoped DB touch:
await withOrganization(organizationId, userId, async (tx) => { ... })
```

### Error handling
**Source:** `apps/server/src/domain/errors.ts`  
**Apply to:** Plan limits, validation, not-found

```typescript
forbidden('…', 'PLAN_LIMIT', { resource, limit, current, upgrade_to })
badRequest(message) // notes/validation
notFound('Property not found')
```

Client: check `error.data.appCode`, not HTTP status 402.

### Validation
**Source:** `modules/*/schemas.ts` + `.input(schema)` on procedures + TanStack Form `validators: { onSubmit: schema }`  
**Apply to:** All create/update mutations and landlord forms via `@villuh/server/schemas/{properties,units,…}`

### Cache invalidation
**Source:** `packages/api/src/invalidate.ts`  
**Apply to:** All landlord mutations that change lists or quotas

```typescript
await invalidateQueries(utils, [
  (u) => u.properties.list, // and/or detail
  (u) => u.units.list,
  (u) => u.me.get,
])
```

### Plan resources
**Source:** `apps/server/src/domain/billing.ts`  
**Apply to:** plan-limit helper + PlanLimitGate resource prop — already `['units', 'properties', 'members']`

### Frontend data fetching
**Source:** CLAUDE.md + profile form  
**Apply to:** All landlord portfolio UI — `trpc.*.useQuery` / `useMutation` only; never raw `fetch` for portfolio CRUD (gallery PUT to S3 presigned URL is the sole exception).

### Icons
**Source:** UI-SPEC / `PlatformIcon`  
**Apply to:** Tags, statuses, empty states — `@central-icons-react/all` via PlatformIcon only; fixed palette keys from UI-SPEC.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/server/src/modules/uploads/s3.ts` | utility | file-I/O | No S3/presign code in monorepo yet — use RESEARCH AWS SDK excerpts |
| `apps/server/src/modules/uploads/router.ts` | controller | file-I/O | First upload pipeline; wrap with `permissionProcedure('write')` + `withOrganization` like other routers |
| `apps/server/src/lib/sanitize-notes.ts` | utility | transform | New `sanitize-html` allowlist — RESEARCH Code Examples |
| `AddressFields` / `NotesEditor` / `PropertyGallery` (+ DnD) | component | request-response / file-I/O | Mapbox Search JS, TipTap, `@dnd-kit` not in repo — follow RESEARCH + UI-SPEC; compose with Field/Input/Dialog |

## Metadata

**Analog search scope:** `apps/server/src/{modules,schema,domain,db,__tests__}`, `apps/landlord-web/{app,modules}`, `packages/{api,ui}/src`  
**Files scanned:** ~60  
**Pattern extraction date:** 2026-08-11  
**Strongest copy targets:** `members/router.ts` (PLAN_LIMIT), `role-permissions.ts` (RLS schema), `permissions/router.ts` (CRUD), `account/schemas.ts` + `profile-settings-form.tsx` (shared Zod forms), `me/router.ts` (quota), `invalidate.ts` (cache), `billing/router.ts` syncUnits (Stripe side effect)
