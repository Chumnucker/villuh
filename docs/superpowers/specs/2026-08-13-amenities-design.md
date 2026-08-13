# Amenities — Design Spec

**Date:** 2026-08-13
**Status:** Approved (design), pending implementation plan
**Scope:** Property amenities, unit amenities, org-wide amenity catalog, amenity galleries. Reservations designed here, built in a later phase.

---

## 1. Problem

The property Settings → Amenities page (`property-settings-amenities-template.tsx`) is a placeholder. It renders two empty `SettingsSection` cards — "Property amenities" and "Amenity catalog" — with "coming soon" empty states. There is no amenity table, migration, tRPC router, Zod schema, or resident-portal surface anywhere in the repo.

A stopgap exists: the 2026-08-12 `property-detail-tabs` quick task deliberately reused the tag system (`organization_tag` / `property_tag`) to display amenities on the property About tab, because no amenity table existed.

Two distinct kinds of amenity are needed:

- **Property amenities** — building/community facilities (pool, gym, clubhouse, lobby). Can have photos and can be reservable.
- **Unit amenities** — in-unit features (in-unit laundry, stainless appliances, granite countertops). No photos, not reservable.

## 2. Why an organization-level catalog

The catalog's value is not saving keystrokes on the second property. It is keeping the *label* identical across properties so an amenity is queryable.

Without a catalog, a landlord accumulates "W/D in unit", "Washer/Dryer", and "washer dryer" across three houses. Any future portfolio filter ("units with in-unit laundry"), resident-portal facet, or listing feed then returns a fraction of the correct rows, silently.

The catalog must therefore cost nothing to maintain, or landlords will bypass it. Two mechanisms achieve that:

1. **Freeform-then-promote**, as `organization_tag` / `property_tag` already does — type a new amenity on a property, optionally promote it to the catalog later.
2. **A seeded starter catalog**, as `ensureDefaultUnitStatuses` already does — the catalog is populated on first use rather than being an empty box demanding data entry.

The catalog is worth little to a landlord with one apartment complex and is the entire point for a landlord with four single-family homes. Being free and optional serves both.

## 3. Decisions

| # | Decision | Rationale |
|---|---|---|
| D-1 | Full domain specced now; catalog + assignments + gallery built now; reservations built in a later phase | Reservations need `tenants` (Phase 4, not started) and a resident-portal request surface |
| D-2 | One `organization_amenity` catalog with `scope = property \| unit \| both`; separate `property_amenity` and `unit_amenity` assignment tables | Catalog fields are identical for both kinds; assignment fields are not (reservability and galleries are property-only). `both` prevents duplicate rows for air conditioning / parking / laundry, which are legitimately either |
| D-3 | Unit amenities attach to units, with bulk-apply from the units table. Floor-plan inheritance deferred | Bulk-apply solves the 200-unit problem at a fraction of the cost of read-time inheritance merging. Floor-plan amenities remain purely additive later (`floor_plan_amenity` + read-time merge; no change to `unit_amenity` rows) |
| D-4 | New `amenity_icon` Postgres enum (~38 curated Solar Linear icons); reuse the existing 8-value `tag_color` | The locked 14-icon tag palette (House, Door, People, Star, Flag, Key, MapPin, Leaf, Flame, Bolt, Heart, Check, Wrench) has no pool, gym, laundry, or wifi. Every amenity would become a star, and the icon would carry no information |
| D-5 | Reservation config (`is_reservable`, `requires_approval`) lives on `property_amenity`, not on the catalog | One building's pool is bookable and another's is not |
| D-6 | Reservations: free-range `starts_at` / `ends_at`, with a Postgres exclusion constraint on overlapping **approved** rows | Free ranges collapse into whole-day and fixed-slot shapes; slots-as-data would need a second table and lock in one rhythm. The constraint lets overlapping *pending* requests coexist while making two approved bookings impossible at the DB layer rather than in racy application code |
| D-7 | Per-property `requires_approval` boolean; statuses `pending \| approved \| denied \| cancelled` | A BBQ grill is first-come-first-served; a clubhouse needs a manager. Unconditional approval trains landlords to rubber-stamp, and the queue becomes noise they stop reading |
| D-8 | Cross-property reservations surface in the sidebar; per-amenity history inside the amenity sheet. Config stays in property Settings | An approval queue is daily operational work, not configuration. A landlord with six properties must not visit six settings pages to clear approvals |
| D-9 | Own module: `modules/amenities/` (frontend) and `modules/amenities/` (server) | Amenities span properties, units, the org catalog, and later a cross-property surface. Placing them in `modules/properties/` (as floor plans are, per 3.2 D-37) would force `modules/units/` to import from `modules/properties/` |
| D-10 | Catalog **archives**, never deletes | Tags cascade-delete assignments. Deleting "Pool" must not silently strip the pool and its photos from eight properties |
| D-11 | `catalog.update` propagates `label`/`icon_key`/`color_key` to assignment rows **whose label still equals the catalog's previous name** | Diverges from `tags.updateOrganizationTag`, which leaves stale labels behind — that would reintroduce the exact drift the catalog prevents. Scoping by previous name preserves deliberately customized per-property labels without needing an override column |
| D-12 | Icon and color are `NOT NULL` with defaults, not nullable | Optional in the UI, never null in the DB. Nullable would push a fallback into every render site (card, chip, sheet header, resident portal, listing feed) and they would disagree |
| D-13 | Amenities are not plan-limited; `syncOrgUnitQuantity` is untouched | Amenities are metadata, not billable entities |
| D-14 | Remove the tags-as-amenities stopgap from the About tab | Two overlapping ways to say a property has a pool will drift |

## 4. Sequencing

New inserted phase **3.3 Amenities**, after Phase 3.2 (Floor Plans).

**Hard gate on Phase 3.1 completing.** The units amenities column lives in `units-columns.tsx`, and Phase 3.1 explicitly forbids modifying the units column defs, `DataTable`, `DataGrid`, or the toolbar for its duration (3.1 D-05, D-28). The amenity sheet should also be declared via 3.1's `createOverlays` and the reservations table via `defineTable`, rather than adding `useState` trios that 3.1 is in the middle of deleting.

**Reservations phase:** after Phase 4 (Tenants, Leases & Documents). Notification delivery for request/approve/deny hooks into Phase 7's notification system rather than growing its own.

## 5. Data model

Four tables ship in phase 3.3. All carry `organization_id` with an `organization_isolation` RLS policy identical to `organization_tag`, and hand-written audit triggers appended to the generated migration (Drizzle does not emit them).

### 5.1 Enums

Added to `apps/server/src/schema/enums.ts`, each built from the same `as const` array backing its Zod validator:

```typescript
export const amenityScopeEnum = pgEnum('amenity_scope', AMENITY_SCOPES)      // property | unit | both
export const amenityIconEnum  = pgEnum('amenity_icon',  AMENITY_ICON_KEYS)
```

`AMENITY_ICON_KEYS` — 38 keys, each mapped to a verified `@solar-icons/react/linear` icon in `PlatformIcon`:

| Key | Solar Linear | Key | Solar Linear |
|---|---|---|---|
| `IconStar` (default) | `star` | `IconOutlet` | `socket` |
| `IconPool` | `swimming` | `IconLighting` | `floor-lamp` |
| `IconGym` | `dumbbell` | `IconLounge` | `armchair` |
| `IconLaundry` | `washing-machine` | `IconGameRoom` | `gamepad` |
| `IconWifi` | `wi-fi-router` | `IconBasketball` | `basketball` |
| `IconPets` | `paw` | `IconTennis` | `tennis` |
| `IconParking` | `garage` | `IconGolf` | `golf` |
| `IconEvCharging` | `electric-refueling` | `IconVolleyball` | `volleyball` |
| `IconAirConditioning` | `snowflake` | `IconWater` | `waterdrop` |
| `IconHeating` | `flame` | `IconPackageLocker` | `box` |
| `IconFridge` | `fridge` | `IconMail` | `mailbox` |
| `IconKitchen` | `chef-hat` | `IconCoworking` | `laptop` |
| `IconBath` | `bath` | `IconCoffee` | `cup-hot` |
| `IconBed` | `bed` | `IconOutdoor` | `leaf` |
| `IconFurnished` | `sofa` | `IconPatio` | `umbrella` |
| `IconTv` | `tv` | `IconRooftop` | `sun` |
| `IconTheater` | `clapperboard` | `IconAccessible` | `accessibility` |
| `IconSecurity` | `shield` | `IconTrack` | `running` |
| `IconCamera` | `camera` | `IconLibrary` | `book` |

Breadth is deliberate: adding a key later costs a migration, so the palette is generous up front.

### 5.2 `organization_amenity` (catalog)

```typescript
export const organizationAmenity = pgTable('organization_amenity', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  scope: amenityScopeEnum('scope').notNull(),
  iconKey: amenityIconEnum('icon_key').notNull().default('IconStar'),
  colorKey: tagColorEnum('color_key').notNull().default('slate'),
  isSystem: boolean('is_system').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('organization_amenity_org_name_unique').on(t.organizationId, t.name),
  pgPolicy('organization_isolation', { /* identical to organization_tag */ }),
]).enableRLS()
```

`isSystem` marks seed provenance only — system rows are freely renamable, re-iconable, and archivable.

### 5.3 `property_amenity` (assignment)

```typescript
export const propertyAmenity = pgTable('property_amenity', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  propertyId: uuid('property_id').notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  // null = freeform, not yet promoted to the catalog
  organizationAmenityId: uuid('organization_amenity_id')
    .references(() => organizationAmenity.id, { onDelete: 'set null' }),
  label: text('label').notNull(),
  description: text('description'),
  iconKey: amenityIconEnum('icon_key').notNull().default('IconStar'),
  colorKey: tagColorEnum('color_key').notNull().default('slate'),
  isReservable: boolean('is_reservable').notNull().default(false),
  requiresApproval: boolean('requires_approval').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, () => [pgPolicy('organization_isolation', { /* … */ })]).enableRLS()
```

Plus a partial unique index:

```sql
CREATE UNIQUE INDEX property_amenity_catalog_unique
  ON property_amenity (property_id, organization_amenity_id)
  WHERE organization_amenity_id IS NOT NULL;
```

This blocks attaching the same catalog amenity twice while leaving freeform rows unconstrained — two custom entries on one property are legitimate.

`label`, `icon_key`, and `color_key` are denormalized so display never requires a join and freeform rows render identically to promoted ones (the `property_tag` pattern).

### 5.4 `unit_amenity` (assignment)

Deliberately thinner: `id`, `organization_id`, `unit_id` (FK cascade), `organization_amenity_id` (FK set null), `label`, `icon_key`, `color_key`, `created_at`, the equivalent partial unique index on `(unit_id, organization_amenity_id)`, and the RLS policy.

No description, no gallery, no reservability. A photo of a faucet is not useful; if a unit amenity needs explaining, the catalog description does it.

### 5.5 `property_amenity_image` (gallery)

Mirrors `property_images` exactly: `id`, `organization_id`, `property_amenity_id` (FK cascade), `object_key`, `content_type`, `byte_length`, `sort_order`, `created_at`, RLS policy.

- `object_key` only, never a URL. Pre-signed GET URLs generated at read time.
- Cap: **10 images** per amenity, with the 11th refused server-side.
- No soft delete — rows are hard-deleted with the S3 object.
- First image by `sort_order` is the cover.

### 5.6 Seeded starter catalog

`ensureDefaultAmenities` (following the `ensureDefaultUnitStatuses` pattern) seeds 22 entries with `is_system = true` on first use:

**Property scope:** Pool, Fitness center, Clubhouse, Package lockers, Secure entry, Elevator, Playground, Grill area, On-site laundry, EV charging
**Both scopes:** Covered parking, Pet friendly, Central air, High-speed internet
**Unit scope:** In-unit laundry, Dishwasher, Stainless steel appliances, Hardwood floors, Balcony / patio, Walk-in closet, Furnished, Ceiling fans

**Seed guard:** skip if the org has *any* `is_system` row, **including archived ones**. Guarding on "zero rows" would resurrect defaults the moment a landlord cleared out the ones they did not want.

## 6. API

One `amenities` router with nested sub-routers, following the pattern `properties` already uses for its nested `gallery`. Reads are `protectedProcedure`; every mutation is `permissionProcedure('write')`; all of it runs inside `withOrganization(organizationId, userId, …)`.

```
amenities: {
  catalog:  { list, create, update, archive, restore, promoteFromProperty, promoteFromUnit },
  property: { list, add, addFreeform, update, remove, reorder, set,
              gallery: { list, add, reorder, remove } },
  unit:     { list, listByProperty, set, addFreeform, remove, bulkAdd, bulkRemove },
}
```

Presigning follows the existing split: `uploads.presignAmenityImage` joins the other presigners, enforces the 10-image cap before returning a URL, and the row is created afterward by `property.gallery.add`.

Two procedures whose semantics are easy to conflate:

- **`property.update`** patches one assignment: `label`, `description`, `iconKey`, `colorKey`, `isReservable`, `requiresApproval`. It never touches the catalog row.
- **`property.set`** / **`unit.set`** bulk-replace a property's or unit's *catalog-backed* assignments from an id array (mirroring `tags.setPropertyTags`), leaving freeform rows untouched. This backs multi-select in the picker; `add` / `addFreeform` / `remove` back single-item interactions.

Zod schemas live in `apps/server/src/modules/amenities/schemas.ts`, exported as `@villuh/server/schemas/amenities` and imported directly by frontend forms — no duplicated validation.

### 6.1 Server-side validation

None of this is trusted from the client:

- **Scope enforcement** — a `unit`-scoped catalog item cannot be attached to a property, and vice versa. `both` permits either.
- **Ownership** — the target property or unit must belong to the caller's organization. RLS covers cross-org, but an explicit 404 beats an opaque zero-row result.
- **Cross-property / cross-unit** — an assignment id must belong to the property or unit named in the input.
- **Promote dedupe** — `promoteFrom*` matches an existing catalog row by name rather than creating a second "Rooftop deck", and links the assignment to the existing row.

### 6.2 Rename propagation (D-11)

`catalog.update` patches the catalog row and, in the same transaction, updates every assignment row where `organization_amenity_id` matches **and** `label` still equals the catalog's previous name. Freeform rows (null FK) and deliberately customized labels are untouched.

### 6.3 Bulk operations

`unit.bulkAdd` takes `unitIds[] × organizationAmenityIds[]` and performs **one** insert with `ON CONFLICT … DO NOTHING` against the partial unique index — re-applying an amenity to 40 units where 12 already have it is one round trip and silently idempotent, not 40 requests and 12 errors. Scope is validated once for the whole batch. `bulkRemove` is a single delete.

`unit.listByProperty` exists so the units table can render an amenities column and filter on it in one query rather than one per row.

### 6.4 Invalidation contract

- **Catalog mutations** → `catalog.list`, `property.list`, **and** `unit.list` — necessary because of rename propagation.
- **Property assignment mutations** → `property.list` + `properties.get` (About tab chips).
- **Unit assignment mutations** → `unit.list`, `unit.listByProperty`.
- **Gallery mutations** → `property.gallery.list` + `property.list` (photo counts).
- Nothing touches `me.get` quotas or the Stripe unit-quantity sync.

Invalidation goes through `invalidateOnSuccess` / `invalidateQueries` from `@villuh/api`, per ADR-001.

## 7. UI

### 7.1 Property Settings → Amenities

Replaces the placeholder template. Two sections, deliberately unequal in weight:

**"Property amenities"** — a card grid of this property's amenities. Each card: colored icon tile, name, description snippet, "Reservable" badge when applicable, photo count. Clicking a card opens the amenity sheet. "Add amenity" uses the search-or-create popover pattern from `TagPicker` — find it in the catalog or create it inline.

**"Amenity catalog"** — compact read-only chips grouped by scope, with **Manage catalog…** in the section's `action` slot opening `ManageAmenityCatalogDialog`. This is the same convention `property-settings-units-template.tsx` already uses for its "Unit statuses" button, and it stops an org-wide concern from visually competing with the per-property one above it.

### 7.2 Amenity sheet

Declared through Phase 3.1's `createOverlays('amenity', …)`, so it is URL-backed and a link cold-loads with the sheet open, fetching by id.

- Header: icon tile, name, reservable state
- Body: editable details, gallery manager, and (once reservations ship) that amenity's reservation history table

Reservations require no change to the sheet — a section appears inside it.

### 7.3 Units

- `AmenityPicker` in `UnitFormSheet` — a near-twin of `TagPicker`, same dual-mode design (staged local array during unit create, live tRPC mutations once a `unitId` exists), filtered to `unit | both` scope.
- Units `DataTable`: amenities column with chip overflow, plus a bulk action bar on row selection offering add and remove.

### 7.4 Property About tab

Read-only amenity chip row, replacing the tag-based stopgap (D-14). `TagBadge` already accepts a color-key variant and both palettes share `tag_color`, so no new primitive is needed.

### 7.5 Gallery manager refactor (in scope)

`modules/properties/components/settings/gallery-manager.tsx` is currently property-specific. By the time amenities ship there will be three galleries: property (existing), floor plan (3.2, 25 images), amenity (10 images). Three copies of drag-reorder-plus-presigned-upload is two too many.

If Phase 3.2 already generalized it, amenities reuse it unchanged. If not, the extraction happens here: a `GalleryManager` taking list/add/reorder/remove callbacks and a cap, with three call sites passing their own tRPC procedures.

### 7.6 New files

```
modules/amenities/components/amenity-picker.tsx              — dual-mode picker (staged / live), scope-filtered
modules/amenities/components/amenity-icon-color-picker.tsx   — 38-icon scrollable grid + 8 colors
modules/amenities/components/manage-catalog-dialog.tsx       — org catalog CRUD (create / edit / archive / restore)
modules/amenities/components/amenity-card.tsx                — settings grid card
modules/amenities/components/amenity-sheet.tsx               — detail overlay
modules/amenities/components/amenity-chip-row.tsx            — read-only display (About tab, unit detail)
modules/amenities/components/unit-amenities-bulk-actions.tsx — units-table selection actions
modules/amenities/lib/amenity-icons.ts                       — palette constants + PlatformIcon key mapping
```

### 7.7 Out of scope

The resident portal. `apps/resident-web` has no amenity surface today and resident-facing work is not yet phased. The data model and read procedures support it — the resident view is a consumer, not a change — but building it is not part of this work.

## 8. Reservations (designed now, built after Phase 4)

### 8.1 Table

A third enum ships with this phase (not with 3.3, since nothing reads it before):

```typescript
export const amenityReservationStatusEnum = pgEnum('amenity_reservation_status', AMENITY_RESERVATION_STATUSES)
// pending | approved | denied | cancelled
```

The `tenantId` FK below targets the tenant table introduced in Phase 4; the exact table identifier follows whatever Phase 4 names it.

```typescript
export const amenityReservation = pgTable('amenity_reservation', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  propertyAmenityId: uuid('property_amenity_id').notNull()
    .references(() => propertyAmenity.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  unitId: uuid('unit_id').references(() => units.id, { onDelete: 'set null' }),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  status: amenityReservationStatusEnum('status').notNull().default('pending'),
  guestCount: integer('guest_count'),
  tenantNote: text('tenant_note'),
  decidedByUserId: text('decided_by_user_id').references(() => user.id, { onDelete: 'set null' }),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  decisionNote: text('decision_note'),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
```

`unit_id` is denormalized for filtering and display. Event timestamps are `timestamptz` (project date convention).

### 8.2 Constraints

```sql
ALTER TABLE amenity_reservation ADD CONSTRAINT amenity_reservation_valid_window
  CHECK (ends_at > starts_at);

CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE amenity_reservation ADD CONSTRAINT amenity_reservation_no_overlap
  EXCLUDE USING gist (property_amenity_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
  WHERE (status = 'approved');
```

**The failure mode this creates is intended and the API must handle it explicitly.** Three tenants request the clubhouse for Saturday evening; all three pending rows coexist. Approving one succeeds. Approving a second violates the constraint, and the mutation must catch that specific violation and return "Another booking was already approved for this window" rather than a 500. Two managers clicking approve in different tabs cannot both win, because the database decides rather than a read-then-write check that can interleave.

### 8.3 Status transitions

- `pending` → `approved` | `denied`
- `pending` | `approved` → `cancelled`
- `denied` is terminal — there is no un-deny; a new request is made instead

Tenants cancel their own upcoming bookings. Managers cancel any, with a note.

### 8.4 Deferred columns

These land on `property_amenity` in the reservations phase, since nothing reads them before: `min_duration_minutes`, `max_duration_minutes`, open hours, advance-notice window, capacity.

### 8.5 UI

- Cross-property `/reservations` surface in the sidebar, built on `defineTable`: property, amenity, tenant, unit, window, status. Filterable, pending-first by default, with approve/deny row actions and bulk approve.
- Reservation detail overlay.
- Per-amenity history inside the existing amenity sheet.
- Resident side: amenity list, request form, "my reservations."
- Notifications for request/approve/deny hook into Phase 7's notification system.

Reservation rows are org-isolated by the same `organization_isolation` RLS policy as every other table; the resident portal reads through the org context established by the resident session, which Phase 4 defines.

## 9. Testing

**Server integration tests** (existing vitest harness):

1. Cross-organization isolation on all four tables
2. Catalog `(organization_id, name)` uniqueness
3. Scope enforcement — unit-scoped amenity rejected on a property, and vice versa; `both` accepted on either
4. Rename propagation updates matching labels **and leaves customized labels untouched**
5. Bulk apply is idempotent via the partial unique index (40 units, 12 pre-existing → no error, no duplicates)
6. Gallery cap — 11th image refused
7. Archiving a catalog item leaves assignments intact and renders unchanged
8. Seed guard does not resurrect archived system rows
9. Promote dedupes by name and links to the existing catalog row
10. Cross-property and cross-unit assignment ids rejected
11. Audit trigger rows written for all four tables

**Reservations phase adds:** two approved overlapping rows rejected; two pending overlapping rows allowed; approving a second conflicting pending returns the friendly error, not a 500.

**Manual verification** — no component test infrastructure exists in this repo (3.1 D-46), so everything above the API layer is checked at checkpoints: the settings page grid, the sheet cold-loading from a pasted URL, the unit picker in both staged and live modes, and bulk apply across a multi-row selection.

**Gates** use the scoped `pnpm --filter` substitution recorded in `.planning/phases/03.1-url-query-state/deferred-items.md`, because monorepo-wide `lint` / `test` cannot exit 0 today for three unrelated pre-existing reasons.

## 10. Accepted risks

- **`amenity_icon` as a real Postgres enum** means every future icon costs a migration. This is the project's stated convention for closed option sets we own, and the alternative is unvalidated free text. Mitigated by seeding a generous 38-key palette up front.
- **The 22-item seed catalog is opinionated and US-centric.** Some landlords will archive half of it. Archive is one click, and the seed guard will not resurrect what was removed.
- **Floor-plan amenity inheritance is deferred.** A landlord with many identical units relies on bulk-apply until then. The later addition is purely additive.
