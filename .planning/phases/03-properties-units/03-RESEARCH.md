# Phase 3: Properties & Units - Research

**Researched:** 2026-08-11
**Domain:** Org-scoped property/unit portfolio CRUD (Postgres + Drizzle RLS, tRPC, S3 gallery, Mapbox address, TipTap notes, plan limits)
**Confidence:** HIGH

## Summary

Phase 3 creates the first durable portfolio entities landlords will lease against: properties, units, org tag catalog + freeform property tags, custom unit statuses, and an S3 image gallery. Locked CONTEXT deferrals remove PROP-03 dashboard stats, PROP-04/05 lease-expiry alerts/renewal notices, live UNIT-03/04 history (stub empty tabs only), and UNIT-05 proration from the build. ROADMAP success criteria still mention those items — **CONTEXT overrides**.

The codebase already has the hard dependencies: `withOrganization` + RLS demo pattern, `me.get` → `org.quota.{units,properties,members}` (counts stubbed at `0`), members-router `PLAN_LIMIT` enforcement, `billing.syncUnits` for Stripe licensed quantity, shared Zod → TanStack Form → tRPC → invalidate pattern, and reserved `/properties` + `/units` nav. Missing: all portfolio tables, S3/Mapbox env + SDKs, TipTap, DnD, `tabs` UI component, and real quota counts.

**Primary recommendation:** Ship schema + RLS + audit triggers first; implement tRPC modules mirroring `members`/`account` (schemas exported via `@villuh/server/schemas/*`); enforce plan limits server-side on create; sync Stripe unit quantity on unit create/archive; build landlord-web CRUD against `03-UI-SPEC.md` with PlanLimitGate reading `me.get` quota.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Scope cut
- **D-01:** Deliver full PROP/UNIT product intent for properties + units CRUD and supporting models, with the explicit deferrals below — not a thin stub of the phase.
- **D-02:** S3 property image gallery is **in** Phase 3 (PROP-01).
- **D-03:** PROP-04 / PROP-05 (lease expiry alert threshold + automatic renewal notices) are **out** — require leases (Phase 4+).
- **D-04:** UNIT-03 / UNIT-04: ship **stub empty history tabs** on unit detail (rent history, tenant history) — no fake data; tabs exist for navigation continuity.
- **D-05:** PROP-03 property dashboard (total units, occupancy, monthly rent, alerts) is **deferred** until more entities exist and product vision for “what to show” is clearer. Do **not** build a stats/alerts strip in Phase 3.
- **D-06:** UNIT-05 (prorated rent on mid-month lease start) is **out** of Phase 3 — requires lease records; revisit with leases.

#### Navigation & IA
- **D-07:** Units appear in **both** places: sidebar `/units` and nested under a property.
- **D-08:** After creating a property → navigate to **property detail**.
- **D-09:** Properties list UI = **cards** (not a dense table as the primary list).
- **D-10:** Create unit from **both** property detail and the Units page (Units page includes a **property picker**).

#### Property form
- **D-11:** Address is **structured** (street, city, region, postal, country) with optional **line2**; entry assisted by **Mapbox**.
- **D-12:** Phone is **optional**.
- **D-13:** Notes are **optional markdown**, edited with **TipTap** WYSIWYG.
- **D-14:** TipTap subset: basic **bold / italic / lists / links / headings** only.
- **D-15:** Sanitize notes **server-side always** (strip HTML/scripts); never trust client HTML.
- **D-16:** Empty notes allowed; UI placeholder **“Add notes…”**.
- **D-17:** Tags: **freeform** on a property **and** org **catalog** tags; freeform can be **promoted** to org catalog when permitted; tags have **icon + color**.

#### Tags (permissions & UX)
- **D-18:** Promote freeform → org tag requires **`write`** permission.
- **D-19:** Edit/delete org catalog tags: **same as promote** (`write`).
- **D-20:** Deleting an org tag that is in use: **cascade detach** from properties **and delete** the tag.
- **D-21:** Icon + color picker: **fixed palette** (preset colors + fixed icon set) — not free hex / arbitrary icons.

#### Mapbox address UX
- **D-22:** Autocomplete **only** as the assisted path → selection **fills structured fields**.
- **D-23:** Store **lat/lng** when address is set via Mapbox (**required** for Mapbox-sourced addresses).
- **D-24:** Countries: any Mapbox supports (configurable), not a hardcoded single-country allowlist for v1.
- **D-25:** Fallback: if Mapbox fails/unavailable → **manual structured fields** still work.

#### Unit status
- **D-26:** Org-defined **custom statuses**; seed **Available / Occupied / Maintenance**.
- **D-27:** Only **owner/admin** may edit the status catalog (create/rename/reorder/archive statuses).
- **D-28:** Phase 3 status assignment is **manual**; design schema/API so Phase 4 can **auto-set Occupied** when a lease is active.
- **D-29:** Status UI: **color badge + icon**.

#### Delete / archive
- **D-30:** Property delete = **soft archive** (not hard delete).
- **D-31:** Archiving a property **cascade soft-archives** its units in the same operation.
- **D-32:** Unit delete = **soft archive**.
- **D-33:** Property archive confirm UX: dialog must **list every affected unit** (and any other cascading data), explain **archive vs permanent delete**, then require **typing the property name**.

#### S3 gallery
- **D-34:** Max **25** images per property.
- **D-35:** **First in order = cover**; landlord can **drag-reorder**.
- **D-36:** Common web image types (JPEG/PNG/WebP/GIF; HEIC if practical); **10MB** max per file.
- **D-37:** Delete image = **immediate** S3 object delete **+** DB row remove (no soft-delete for gallery rows).
- **D-38:** Persist **`objectKey` only** in DB; pre-signed GET URLs at read time (project S3 rule).

#### Plan-limit UX
- **D-39:** Build a reusable **PlanLimitGate** (wrap triggers such as “Create property” / “Create unit”). If org quota for that resource is at/over limit, open a **LimitReachedDialog** instead of the create dialog/flow.
- **D-40:** Dialog shows: attempted action, which limit was hit (e.g. properties 10/10), and upgrade/billing CTA.
- **D-41:** Quotas come from **shared org data already loaded early** (prefer `me.get` → `org.quota`, already shaped as `{ units, properties, members: { count, limit } }`). Gate components read that cache — callers pass **resource/action type**, not raw counts.
- **D-42:** Extensible pattern (Phase 3 wires **properties** + **units**; members already limited elsewhere).
- **D-43:** **UI + server both enforce**. Mutations still return **`402` / `PLAN_LIMIT`** as hard backstop (align with Phase 2 D-41/D-42). Invalidate/refetch `me.get` (or quota) after successful creates/archives that change counts.

### Claude's Discretion
- Exact TipTap package set / toolbar chrome within the locked subset
- Mapbox SDK choice and env wiring details
- Soft-archive column naming (`archived_at` vs `deleted_at`) consistent with existing schema conventions
- Whether property cards show cover thumb + tag chips + unit count snippet (no PROP-03 dashboard)
- PlanLimitGate API shape (HOC vs render-prop vs provider) as long as D-39–D-43 hold
- Fixed tag icon/color palette contents
- UNIT stub tab empty-state copy

### Deferred Ideas (OUT OF SCOPE)
- **PROP-03** — Property dashboard (units, occupancy, rent total, alerts) — deferred until more of the product exists
- **PROP-04** — Per-property lease expiry alert threshold
- **PROP-05** — Automatic tenant renewal notices (email/SMS)
- **UNIT-03 / UNIT-04** — Live rent history & tenant history (Phase 3 = empty stub tabs only)
- **UNIT-05** — Mid-month prorated rent + override (needs leases)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support | Phase 3 delivery |
|----|-------------|------------------|------------------|
| PROP-01 | CRUD properties with name, address, phone, notes, S3 gallery | Schema + tRPC + S3 presign; TipTap notes; soft-archive | **Full** (delete = soft archive) |
| PROP-02 | Tag properties with custom labels | Org catalog + freeform + promote; fixed icon/color | **Full** |
| PROP-03 | Property dashboard stats/alerts | Deferred D-05 | **Out** — do not build |
| PROP-04 | Per-property lease expiry alert threshold | Deferred D-03 | **Out** |
| PROP-05 | Automatic renewal notices | Deferred D-03 | **Out** |
| UNIT-01 | CRUD units (property, label, sq ft, base rent, status) | Units router + custom status FK; soft-archive | **Full** |
| UNIT-02 | Custom availability statuses (seed 3 defaults) | `unit_status` catalog + admin-only mutations | **Full** |
| UNIT-03 | Rent history | Stub empty tab only (D-04) | **Stub UI only** |
| UNIT-04 | Tenant history | Stub empty tab only (D-04) | **Stub UI only** |
| UNIT-05 | Mid-month prorated rent | Deferred D-06 | **Out** |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Stack: Next.js App Router + **Express 5 + tRPC** (not Hono) + Postgres + Drizzle + Better Auth. [VERIFIED: CLAUDE.md]
- Frontends call via `@villuh/api` (`trpc.*.useQuery` / `useMutation`) — never raw `fetch` in components. [VERIFIED: CLAUDE.md]
- Org isolation: every org-scoped procedure uses `withOrganization(organizationId, actorId, fn)` + RLS on `organization_id`. [VERIFIED: `apps/server/src/db/organization.ts`]
- S3: store **`objectKey` only**; generate pre-signed GET at read time. [VERIFIED: CLAUDE.md]
- Dates: `date` for lease dates (N/A this phase); `timestamptz` for event timestamps. [VERIFIED: CLAUDE.md]
- Icons: `@central-icons-react/all` via `PlatformIcon` only. [VERIFIED: STATE.md / UI-SPEC]
- Root scripts via Turbo — never bypass for build/dev/lint/test. [VERIFIED: CLAUDE.md]
- Audit log: attach triggers to new tenant tables (Phase 1 pattern). [VERIFIED: migrations `0001`/`0005`/`0011`]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Property/unit CRUD + validation | API / Backend | Browser / Client | Business rules, plan limits, sanitization, RLS live in tRPC |
| Org tags + promote + detach | API / Backend | Browser / Client | Permission checks (`write`) and cascade delete must be server-side |
| Unit status catalog | API / Backend | Browser / Client | Admin-only catalog; client is badge/picker UI |
| Soft-archive cascade | API / Backend | Database / Storage | Single transaction updates property + units |
| Plan limit enforcement | API / Backend | Browser / Client | Server `PLAN_LIMIT` is hard backstop; PlanLimitGate is UX |
| Stripe unit quantity sync | API / Backend | — | Call shared billing helper after unit create/archive |
| S3 presign PUT/GET/DELETE | API / Backend | Browser / Client | Server signs; browser PUTs bytes; DB stores objectKey |
| Mapbox autocomplete | Browser / Client | — | Public token + Search JS; fills structured fields + lat/lng |
| TipTap notes editing | Browser / Client | API / Backend | Client edits HTML; server sanitizes before persist |
| List/detail UI, Sheets, Dialogs | Browser / Client | Frontend Server (SSR) | App Router pages under `requireMe`; data via tRPC |
| Quota display / gate | Browser / Client | API / Backend | Reads `me.get` cache; server recounts on mutate |
| Postgres persistence + RLS | Database / Storage | API / Backend | Source of truth; RLS enforces org isolation |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | 0.45.2 (in repo) | Schema + migrations | Existing server ORM [VERIFIED: `apps/server/package.json`] |
| tRPC + Zod | 11.17.0 / 4.3.6 | Typed RPC + validation | Project standard [VERIFIED: package.json] |
| `@aws-sdk/client-s3` | 3.1108.0 | S3 Put/Get/Delete | Official AWS SDK v3 [VERIFIED: npm registry] |
| `@aws-sdk/s3-request-presigner` | 3.1108.0 | Presigned PUT/GET URLs | Official companion [VERIFIED: npm registry] |
| `@mapbox/search-js-react` | 1.6.0 | AddressAutofill | Official Mapbox Search JS React [VERIFIED: npm + docs.mapbox.com] |
| `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-link` | 3.30.0 | Notes WYSIWYG | Locked TipTap subset [VERIFIED: npm + Context7] |
| `sanitize-html` | 2.17.6 | Server-side HTML allowlist | Node-friendly; no DOM required [VERIFIED: npm + Context7] |
| `@dnd-kit/core` + `@dnd-kit/sortable` | 6.3.1 / 10.0.0 | Gallery + status reorder | Not in monorepo yet; standard React DnD [VERIFIED: npm] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tiptap/pm` | 3.30.0 | ProseMirror peer | TipTap dependency |
| shadcn `tabs` | via `@villuh/ui` | Unit detail tabs | Install per UI-SPEC [VERIFIED: 03-UI-SPEC.md] |
| TanStack Form | 1.33.4 (in repo) | Property/unit forms | Match profile-settings pattern [VERIFIED: landlord-web] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@mapbox/search-js-react` AddressAutofill | Mapbox Geocoding API + custom combobox | More control, more code; Autofill already fills structured fields — prefer Autofill (D-22) |
| `sanitize-html` | `isomorphic-dompurify` 3.22.0 | DOMPurify needs JSDOM on server; heavier. Prefer `sanitize-html` on Express |
| Client → S3 presign PUT | Multipart through Express (multer) | Violates architecture research + scales poorly; do **not** proxy file bytes |
| TipTap HTML storage | Markdown-only (`tiptap-markdown`) | D-13 wording says markdown but TipTap+D-15 imply HTML; **store sanitized HTML** (see Assumptions) |
| HEIC support | `heic2any` client convert | Optional; skip server HEIC — accept JPEG/PNG/WebP/GIF only unless product insists |

**Installation (landlord-web):**
```bash
pnpm --filter @villuh/landlord-web add \
  @mapbox/search-js-react \
  @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/pm \
  @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Installation (server):**
```bash
pnpm --filter @villuh/server add \
  @aws-sdk/client-s3 @aws-sdk/s3-request-presigner \
  sanitize-html
# + @types/sanitize-html if needed
```

**Version verification:** npm view run 2026-08-11 — versions in table above.

## Architecture Patterns

### System Architecture Diagram

```
Landlord browser (landlord-web)
  │  trpc.*.useQuery / useMutation  (@villuh/api)
  │  Mapbox AddressAutofill (public token) ──► Mapbox Search API
  │  TipTap editor (HTML) ───────────────────► notes field in mutation
  │  Gallery: PUT bytes to presigned URL ────► S3
  ▼
Express /trpc (apps/server)
  │  permissionProcedure('write'|'admin')
  │  withOrganization(orgId, userId) → SET LOCAL org + actor
  │  sanitize-html(notes) before insert/update
  │  check plan_limits (properties|units); forbidden PLAN_LIMIT
  │  on unit create/archive → sync Stripe subscription quantity
  │  uploads.presign → PutObjectCommand signed URL + objectKey
  │  gallery.read → GetObjectCommand signed URL (short TTL)
  │  gallery.delete → DeleteObjectCommand + DELETE row
  ▼
Postgres (RLS)
  properties / units / tags / unit_statuses / property_images
  audit_log triggers (organization_id from SET LOCAL)
```

### Recommended Project Structure

```
apps/server/src/
├── schema/
│   ├── properties.ts          # properties, property_images
│   ├── units.ts               # units, unit_statuses
│   └── tags.ts                # organization_tags, property_tags
├── modules/
│   ├── properties/            # router.ts, schemas.ts, service.ts
│   ├── units/                 # router.ts, schemas.ts, service.ts
│   ├── tags/                  # router.ts, schemas.ts
│   ├── unit-statuses/         # router.ts, schemas.ts
│   └── uploads/               # router.ts, schemas.ts, s3.ts
├── lib/
│   └── sanitize-notes.ts      # shared TipTap allowlist
└── domain/
    └── plan-limit.ts          # extract checkPlanLimit helper (reuse members pattern)

apps/landlord-web/
├── app/(app)/
│   ├── properties/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [propertyId]/
│   │       ├── page.tsx
│   │       └── edit/page.tsx
│   └── units/
│       ├── page.tsx
│       └── [unitId]/page.tsx
└── modules/app/components/
    ├── plan-limit/            # PlanLimitGate, LimitReachedDialog
    ├── properties/            # PropertyCard, gallery, address, notes, archive
    ├── units/                 # Unit sheet form, StatusBadge, stub tabs
    └── tags/                  # TagPicker, manage tags
```

### Pattern 1: Org-scoped table + RLS (copy `testOrganizationData`)

**What:** Every portfolio table has `organization_id text NOT NULL` FK → `organization.id`, `pgPolicy` on `villuh_app`, `.enableRLS()`, audit trigger attached.
**When to use:** All new tenant tables in this phase.
**Example:** See `apps/server/src/schema/rls.ts` — `organization_isolation` policy using `current_setting('app.current_organization_id', true)`. [VERIFIED: codebase]

### Pattern 2: Plan limit check (members router)

**What:** Inside `withOrganization`, count active resources, load `plan_limits` for resolved tier, if `limit !== -1 && count >= limit` → `forbidden(..., 'PLAN_LIMIT', { resource, limit, current, upgrade_to })`.
**When to use:** `properties.create`, `units.create` (and any future gated creates).
**Note:** tRPC uses `FORBIDDEN` with `appCode: 'PLAN_LIMIT'` (not HTTP 402 literal). Client maps `error.data.appCode === 'PLAN_LIMIT'`. Align copy with UI-SPEC; Phase 2 D-42 mentioned 402 — existing members path is the live pattern. [VERIFIED: `members/router.ts`, `errors.ts`, `trpc.ts` errorFormatter]

### Pattern 3: Shared Zod schemas for forms

**What:** Define input schemas in `modules/*/schemas.ts`, export via `package.json` `./schemas/<name>`, import in landlord-web forms + tRPC `.input()`.
**When to use:** All create/update mutations. [VERIFIED: `account/schemas.ts` + `profile-settings-form.tsx`]

### Pattern 4: S3 presign upload (architecture research, adapted to tRPC)

**What:**
1. Client requests `uploads.presignPropertyImage({ propertyId, contentType, byteLength, filename })`
2. Server validates type/size/count (< 25), returns `{ uploadUrl, objectKey }`
3. Client `fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } })`
4. Client calls `properties.gallery.add({ propertyId, objectKey, ... })` to insert DB row
5. Reads return short-lived GET URLs; never store URLs
**When to use:** Gallery only in Phase 3 (reuse module later for lease PDFs). [CITED: `.planning/research/ARCHITECTURE.md` File Upload; CLAUDE.md]

### Pattern 5: Soft-archive

**What:** Prefer column name `archived_at timestamptz null` (no existing soft-delete columns in schema — Claude's discretion). Active lists filter `WHERE archived_at IS NULL`. Property archive sets `archived_at = now()` on property **and** all child units in one transaction. Quotas and Stripe quantity count **non-archived** units/properties only.
**When to use:** Property/unit “delete” flows (D-30–D-32).

### Pattern 6: Status seeding for existing orgs

**What:** `ensureDefaultUnitStatuses(orgId, tx)` upserts Available / Occupied / Maintenance with UI-SPEC icon/color keys (`green/IconCircleCheck`, `blue/IconPeople`, `amber/IconWrench`), `is_system = true`, sort_order 0..2. Call from `unitStatuses.list` and before unit create if empty. Do **not** rely solely on org-create hook (many orgs already exist).

### Pattern 7: Tag model (catalog + freeform)

**Recommended schema:**
- `organization_tag` — org catalog (`name`, `icon_key`, `color_key`, unique per org name)
- `property_tag` — assignment rows:
  - `organization_tag_id` nullable FK when catalog-backed
  - `label`, `icon_key`, `color_key` always present (denormalized for freeform + stable display)
  - freeform: `organization_tag_id IS NULL`
  - promote: insert `organization_tag`, set FK on matching freeform rows (or current property only — recommend: promote creates catalog tag; current chip becomes catalog-linked)
- Delete org tag: delete junction rows referencing it, then delete catalog row (D-20)

### Pattern 8: Stripe unit sync side effect

**What:** After successful unit create/archive (and property archive that cascades units), compute `COUNT(*)` active units and call internal billing helper equivalent to `billing.syncUnits` (prefer shared service function — avoid tRPC-calling-tRPC). Skip when no subscription (`skipped: true` already exists). [VERIFIED: `billing/router.ts` syncUnits; CONTEXT code_context]

### Anti-Patterns to Avoid

- **Building PROP-03/04/05 or UNIT-05** — CONTEXT lock; planner must not schedule them.
- **Storing presigned URLs in DB** — expires; violates CLAUDE.md.
- **Proxying file uploads through Express** — use client PUT to S3.
- **Trusting TipTap HTML client-side only** — always `sanitize-html` on server (D-15).
- **Hard-deleting properties/units** — soft-archive only.
- **Counting archived entities toward plan limits / Stripe quantity**.
- **Using lucide-react** — PlatformIcon only.
- **Raw fetch for portfolio data** — tRPC only.
- **Nested `withOrganization`** — pass `tx` when already inside a transaction (see `me` router comment).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| S3 signing | Custom HMAC | `@aws-sdk/s3-request-presigner` | Correct canonical requests, expiry, headers |
| Address parse/geocode | DIY autocomplete | `@mapbox/search-js-react` AddressAutofill | Structured fields + coordinates via retrieve |
| HTML XSS sanitization | Regex strip | `sanitize-html` allowlist | Scripts/events/href edge cases |
| Drag-reorder | Custom mouse math | `@dnd-kit/sortable` | Accessibility + touch |
| Plan limit error shape | Ad-hoc strings | `forbidden(..., 'PLAN_LIMIT', meta)` | Matches errorFormatter + UI gate |
| Rich text editor | contentEditable DIY | TipTap StarterKit subset | Stable document model |

**Key insight:** Portfolio CRUD is mostly product schema + existing Villuh patterns; the only net-new infrastructure risk is S3/Mapbox env wiring and consistent soft-archive/quota/Stripe counting.

## Common Pitfalls

### Pitfall 1: Presigned PUT Content-Type mismatch
**What goes wrong:** Browser PUT fails with 403 because signed headers don't include the same `Content-Type`.
**Why it happens:** Presign signs specific headers; client sends different type.
**How to avoid:** Pass `ContentType` into `PutObjectCommand`; client must PUT with identical `Content-Type`. Cap `byteLength` server-side before signing.
**Warning signs:** Gallery upload works in Postman but fails in browser CORS/403.

### Pitfall 2: Quota / Stripe count includes archived rows
**What goes wrong:** Org cannot create after archiving; or Stripe bills archived units.
**Why it happens:** `COUNT(*)` without `archived_at IS NULL`.
**How to avoid:** Shared `countActiveProperties` / `countActiveUnits` helpers used by me.get, create gates, and syncUnits callers.

### Pitfall 3: Soft-archive cascade not transactional
**What goes wrong:** Property archived, units still active (or reverse on failure).
**How to avoid:** Single `withOrganization` transaction; update property then units; then Stripe sync **after** commit with final count.

### Pitfall 4: TipTap SSR hydration errors on Next.js
**What goes wrong:** Editor mismatches on hydrate.
**How to avoid:** `useEditor({ immediatelyRender: false, ... })` per TipTap React docs. [CITED: Context7 TipTap React]

### Pitfall 5: Mapbox token missing → broken create form
**What goes wrong:** AddressAutofill throws; form unusable.
**How to avoid:** D-25 — if `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` absent or Autofill errors, show manual structured fields + UI-SPEC hint copy. Lat/lng nullable for manual entry; required only when Mapbox retrieve succeeded (D-23).

### Pitfall 6: Audit trigger not attached
**What goes wrong:** SETT-02 audit log misses property/unit changes.
**How to avoid:** Migration `CREATE TRIGGER ... EXECUTE FUNCTION audit_log_trigger_fn()` on every new org-scoped table (same as `role_permissions`). Trigger reads `app.current_organization_id` (post-0011). [VERIFIED: `0011_organization_id_rename.sql`]

### Pitfall 7: Assuming HTTP 402 from tRPC
**What goes wrong:** Client checks `error.data.httpStatus === 402` and misses limits.
**How to avoid:** Check `error.data.appCode === 'PLAN_LIMIT'` (errorFormatter). UI-SPEC copy still says 402 metaphorically.

### Pitfall 8: Gallery on create before property id exists
**What goes wrong:** objectKey path needs propertyId.
**How to avoid:** UI-SPEC preference — gallery on detail/edit only; create navigates to detail (D-08) then upload.

### Pitfall 9: Status catalog permission confusion
**What goes wrong:** Managers with `write` can edit statuses (violates D-27).
**How to avoid:** Status catalog mutations use `permissionProcedure('admin')`. Unit status *assignment* uses `write`. Seeded `is_system` statuses: rename OK; delete/archive blocked or restricted per UI-SPEC.

### Pitfall 10: Phase 2 wizard / subscription gate incomplete
**What goes wrong:** Planner assumes `onboarding_state` or subscriptionExpiredGate exists.
**How to avoid:** `wizard.test.ts` / `plan-limit.test.ts` still have TODO expects; no `onboarding_state` table in migrations. Phase 3 creates **real** tables; wizard migration is a separate follow-up unless Plan 06 lands first. [VERIFIED: grep]

## Code Examples

### Plan limit (live pattern)
```typescript
// Source: apps/server/src/modules/members/router.ts
if (limit !== -1 && totalMembers >= limit) {
  forbidden('Member plan limit reached', 'PLAN_LIMIT', {
    resource: 'members',
    limit,
    current: totalMembers,
    upgrade_to: tier === 'starter' ? 'growth' : 'pro',
  })
}
```

### me.get quota shape (wire real counts)
```typescript
// Source: apps/server/src/modules/me/router.ts
quota: {
  units: { count: counts.units, limit: limits['units'] ?? 5 },
  properties: { count: counts.properties, limit: limits['properties'] ?? 1 },
  members: { count: counts.members, limit: limits['members'] ?? 2 },
}
```

### S3 presign GET/PUT
```typescript
// Source: @aws-sdk/s3-request-presigner README (Context7 /aws/aws-sdk-js-v3)
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const client = new S3Client({ region: process.env.AWS_REGION })
const uploadUrl = await getSignedUrl(
  client,
  new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: objectKey,
    ContentType: contentType,
  }),
  { expiresIn: 900 },
)
```

### TipTap subset + SSR-safe init
```typescript
// Source: Context7 /ueberdosis/tiptap-docs
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'

const editor = useEditor({
  immediatelyRender: false,
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      // disable unused: codeBlock, blockquote, etc. as needed
    }),
    Link.configure({ openOnClick: false }),
  ],
  content: initialHtml || '',
})
// Persist: editor.getHTML() → server sanitize-html
```

### sanitize-html allowlist for TipTap subset
```typescript
// Source: Context7 /apostrophecms/sanitize-html — adapted for D-14
import sanitizeHtml from 'sanitize-html'

export function sanitizeNotesHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h2', 'h3'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  })
}
```

### Mapbox AddressAutofill + onRetrieve for lat/lng
```tsx
// Source: docs.mapbox.com Mapbox Search JS React + autofill retrieve
import { AddressAutofill } from '@mapbox/search-js-react'

<AddressAutofill
  accessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!}
  onRetrieve={(res) => {
    const feature = res.features[0]
    if (!feature) return
    const [lng, lat] = feature.geometry.coordinates
    // Also read structured fields from autofilled inputs (address-line1, etc.)
    setLatLng({ lat, lng })
  }}
>
  <input autoComplete="address-line1" name="street" />
  {/* line2, city, region, postal, country with matching autocomplete attrs */}
</AddressAutofill>
```

### Client mutation invalidation
```typescript
// Source: packages/api/src/invalidate.ts
onSuccess: async () => {
  await invalidateQueries(utils, [
    (u) => u.properties.list,
    (u) => u.me.get, // quotas
  ])
}
```

### objectKey convention (recommended)
```
{organizationId}/properties/{propertyId}/gallery/{uuid}.{ext}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hono routes + `hono/client` in old plans | Express + tRPC `AppRouter` | 2026-08-11 | All Phase 3 APIs are tRPC procedures |
| `landlord_id` / `app.current_landlord_id` | `organization_id` / `app.current_organization_id` | migrations 0011–0012 | New tables must use organization naming |
| Proxy uploads through API | Presigned client PUT | Architecture research | Server never buffers image bytes |
| Lucide icons | PlatformIcon / central-icons | Phase 1 | UI-SPEC icon keys only |

**Deprecated/outdated:**
- Phase 2 plans referencing `packages/web` + Hono paths — historical; implement in `apps/landlord-web` + `apps/server`.
- ROADMAP Phase 3 success criteria #2/#5 for dashboard/alerts/proration — superseded by CONTEXT D-03–D-06.

## Recommended Plan Wave Structure

| Wave | Focus | Depends on |
|------|-------|------------|
| **0** | Vitest files for properties/units/plan-limit/gallery; S3/Mapbox env in `.env.example`; install deps; add `tabs` to `@villuh/ui` | — |
| **1** | Drizzle schemas + migration: properties, units, unit_statuses, tags, property_images; RLS; audit triggers; seed helper | Wave 0 |
| **2** | tRPC: properties, units, tags, unitStatuses, uploads; plan-limit helper; sanitize notes; me.get real counts; Stripe sync hook | Wave 1 |
| **3** | Landlord routes + list/detail/create/edit pages; PlanLimitGate; property cards; unit table + Sheet | Wave 2 |
| **4** | Mapbox AddressFields; TipTap NotesEditor; gallery upload/reorder/delete; tag picker + promote; status catalog UI | Wave 3 |
| **5** | Archive dialogs (type-name + unit list); unit stub history tabs; polish empty/loading/copy per UI-SPEC | Wave 4 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Persist TipTap notes as **sanitized HTML** (not markdown source), despite D-13 “markdown” wording | Notes / TipTap | If product requires MD source, need serializer + different renderer |
| A2 | Soft-archive column named `archived_at` (not `deleted_at`) | Soft-archive | Naming inconsistency if later phases pick different term |
| A3 | `base_rent` stored as **integer cents** | Units schema | Display/FX bugs if float dollars used instead |
| A4 | Skip HEIC in v1 (JPEG/PNG/WebP/GIF only) | Gallery | Some mobile uploads rejected |
| A5 | Status catalog mutations use `permissionProcedure('admin')` to satisfy owner/admin (D-27) | Permissions | If “admin” action ≠ owners-only intent for some custom roles |
| A6 | No LocalStack/MinIO required in CI for Wave 0 — mock S3 client in unit tests; integration optional | Validation | Gallery E2E needs real/mock bucket later |
| A7 | Phase 2 wizard/`onboarding_state` not a Phase 3 blocker — real tables supersede temp wizard storage | Dependencies | If AUTH-08 still required before portfolio UX, coordinate Plan 06 |

**If this table is empty:** N/A — assumptions listed above need planner awareness (A1 especially).

## Open Questions (RESOLVED)

1. **Notes storage format (HTML vs markdown)**
   - What we know: TipTap `getHTML()` + D-15 sanitize HTML; D-13 says “optional markdown”.
   - What's unclear: whether export/search needs markdown later.
   - Recommendation: Store sanitized HTML; treat D-13 as “rich notes via TipTap” (confirm only if user objects).
   - **RESOLVED:** Persist sanitized HTML (Assumption A1 / TipTap HTML output) — not markdown source. Plans 03-01 (sanitize-html), 03-03 (`sanitizeNotesHtml`), and 03-05 (TipTap → HTML) already assume this.

2. **S3 provider & bucket env**
   - What we know: No S3 vars in `.env.example` yet; architecture assumes AWS S3-compatible.
   - What's unclear: AWS vs R2/MinIO for local/dev.
   - Recommendation: Env `S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, optional `S3_ENDPOINT` for compatible stores; document in Wave 0.
   - **RESOLVED:** Env shape as planned in 03-01 (`S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, optional `S3_ENDPOINT`). Compatible endpoints (R2/MinIO) via `S3_ENDPOINT` only — no alternate key scheme.

3. **Mapbox token scoping**
   - What we know: AddressAutofill needs a **public** access token in the browser.
   - What's unclear: URL restrictions / billing alerts for token.
   - Recommendation: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` with URL restrictions to landlord app hosts.
   - **RESOLVED:** Public client token `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (03-01 user_setup + landlord `.env.example`); URL-restrict to landlord hosts in Mapbox dashboard. Missing token → manual address fields (D-25).

4. **Subscription expired write gate**
   - What we know: `SUBSCRIPTION_REQUIRED` exists; plan-limit tests still TODO for expired gate.
   - What's unclear: whether Phase 3 must implement the gate or inherit from unfinished Phase 2 Plan 06.
   - Recommendation: Enforce `PLAN_LIMIT` solidly in Phase 3; add expired-status check on write procedures if not already middleware — flag to orchestrator if Plan 06 incomplete.
   - **RESOLVED:** OUT of Phase 3 — AUTH-04 / Phase 2 concern (`subscriptionExpiredGate`). Plan 03-04 already defers AUTH-04 TODOs and does not implement the expired write gate; Phase 3 enforces `PLAN_LIMIT` only.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v24.12.0 (≥22 required) | — |
| pnpm | Monorepo | ✓ | 11.1.3 | — |
| PostgreSQL | Data layer | ✓ | pg_isready accepting | — |
| Docker | Optional local services | ✓ | 29.6.1 | — |
| AWS S3 bucket + credentials | Gallery | ✗ (not in env yet) | — | Mock S3 in tests; block real gallery until secrets set |
| Mapbox access token | Address autofill | ✗ (not in env yet) | — | Manual address fields (D-25) |
| MinIO/LocalStack | Local S3 | ✗ | — | Use real S3 bucket or mock client |

**Missing dependencies with no fallback:**
- Production S3 credentials/bucket for live gallery uploads (dev can mock).

**Missing dependencies with fallback:**
- Mapbox token → manual structured address entry.
- HEIC support → reject with toast / convert client-side later.

## Validation Architecture

> `workflow.nyquist_validation` is **true** in `.planning/config.json` — section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 (`apps/server`) |
| Config file | `apps/server/vitest.config.ts` |
| Quick run command | `pnpm --filter @villuh/server test -- src/__tests__/properties.test.ts` |
| Full suite command | `pnpm --filter @villuh/server test` |
| Frontend tests | **None today** (landlord-web has no test script) — Phase 3 server integration tests are primary automation |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROP-01 | Create/update property; soft-archive; notes sanitized | integration | `pnpm --filter @villuh/server test -- src/__tests__/properties.test.ts` | ❌ Wave 0 |
| PROP-01 | Gallery: max 25, type/size reject, objectKey only, delete removes S3+row | integration (S3 mocked) | `... gallery.test.ts` | ❌ Wave 0 |
| PROP-02 | Freeform tag + promote + delete org tag detaches | integration | `... tags.test.ts` | ❌ Wave 0 |
| PROP-03 | — | — | — | Deferred — no tests |
| PROP-04/05 | — | — | — | Deferred — no tests |
| UNIT-01 | Create/update unit; plan limit; soft-archive | integration | `... units.test.ts` | ❌ Wave 0 |
| UNIT-01 | Stripe syncUnits called with active count | integration (Stripe mocked) | `... units.test.ts` | ❌ Wave 0 |
| UNIT-02 | Seed defaults; admin-only catalog mutate; viewer forbidden | integration | `... unit-statuses.test.ts` | ❌ Wave 0 |
| UNIT-03/04 | — | manual UI | Visual stub tabs | Stub only |
| UNIT-05 | — | — | — | Deferred |
| Cross | `me.get` quota counts match active properties/units | integration | `... org.test.ts` or properties | ❌ extend |
| Cross | RLS isolation across orgs | integration | properties/units tests | ❌ Wave 0 |
| D-39–43 | Create at limit → PLAN_LIMIT appCode | integration | extend `plan-limit.test.ts` | ⚠️ stub TODO today |

### Sampling Rate

- **Per task commit:** targeted Vitest file(s) for touched module (`< 30s` when DB up)
- **Per wave merge:** `pnpm --filter @villuh/server test`
- **Phase gate:** Full server suite green + manual UI pass against UI-SPEC screens 1–8 before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/server/src/__tests__/properties.test.ts` — PROP-01 CRUD, archive cascade, sanitize notes, RLS
- [ ] `apps/server/src/__tests__/units.test.ts` — UNIT-01 CRUD, plan limit, Stripe sync, archive
- [ ] `apps/server/src/__tests__/tags.test.ts` — PROP-02 promote/delete detach
- [ ] `apps/server/src/__tests__/unit-statuses.test.ts` — UNIT-02 seed + admin gate
- [ ] `apps/server/src/__tests__/gallery.test.ts` — S3 mock, limits, delete
- [ ] Replace TODO expects in `plan-limit.test.ts` for properties/units (or add dedicated cases)
- [ ] Env examples: `S3_*`, `AWS_*`, `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- [ ] Optional: landlord-web Playwright later — **not blocking** if server tests cover API contracts; UI verified manually per UI-SPEC

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Better Auth session; `protectedProcedure` |
| V3 Session Management | yes | Cookie session + activeOrganizationId |
| V4 Access Control | yes | `permissionProcedure('write'|'admin')` + Postgres RLS |
| V5 Input Validation | yes | Zod schemas; `sanitize-html` for notes; content-type/size for uploads |
| V6 Cryptography | yes (S3) | AWS SDK signing — never hand-roll HMAC |
| V8 Data Protection | yes | objectKey only; short-lived GET URLs; no public bucket listing assumed |
| V13 API | yes | tRPC error codes; no org id from client body for isolation (use session org) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-org data access | Elevation | RLS + `withOrganization`; never trust client `organizationId` |
| Stored XSS via notes | Tampering | Server `sanitize-html` allowlist; render as sanitized HTML |
| Plan limit bypass | Elevation | Server recount + `PLAN_LIMIT`; UI gate is not sufficient |
| Unauthorized S3 object guess | Information disclosure | Opaque UUID keys under org/property prefix; private bucket; auth before presign |
| Content-Type spoof / oversized upload | Tampering | Validate MIME allowlist + byteLength before presign; optional post-upload HEAD |
| Privilege escalation on status catalog | Elevation | `admin` permission only (D-27) |
| Accidental cascade archive | Denial / Tampering | Type-name confirm + list affected units (UI); server still requires write |

## Sources

### Primary (HIGH confidence)

- Codebase: `me/router.ts`, `members/router.ts`, `billing/router.ts` (syncUnits), `db/organization.ts`, `schema/rls.ts`, `invalidate.ts`, `profile-settings-form.tsx`, `03-CONTEXT.md`, `03-UI-SPEC.md`
- Context7: `/aws/aws-sdk-js-v3` (presigner), `/ueberdosis/tiptap-docs` (React + StarterKit), `/apostrophecms/sanitize-html`
- Official: https://docs.mapbox.com/mapbox-search-js/guides/autofill/react/
- npm registry versions (2026-08-11): AWS SDK 3.1108.0, TipTap 3.30.0, Mapbox search-js-react 1.6.0, sanitize-html 2.17.6, dnd-kit 6.3.1/10.0.0
- `.planning/research/ARCHITECTURE.md` — S3 presign pattern
- CLAUDE.md — tRPC, RLS, objectKey rules

### Secondary (MEDIUM confidence)

- Phase 2 CONTEXT D-21 Stripe quantity sync (wording still says “Hono route”; live code is tRPC `billing.syncUnits`)
- UI-SPEC approved contract for screens/copy/palette

### Tertiary (LOW confidence)

- Exact AWS vs R2 deployment target for production bucket — not specified in repo env [ASSUMED compatible S3 API]
- HEIC practicality in landlord browsers — skipped for v1 [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — versions verified via npm; libs confirmed in official docs/Context7
- Architecture: **HIGH** — mirrors existing server modules + locked CONTEXT; S3 pattern from project architecture research
- Pitfalls: **HIGH** — derived from live code gaps (stub quotas, TODO plan-limit tests) + known S3/TipTap/Mapbox failure modes
- Deferred scope clarity: **HIGH** — CONTEXT explicit

**Research date:** 2026-08-11
**Valid until:** ~2026-09-11 (30 days; Mapbox/TipTap/AWS SDKs move slower than weekly)
