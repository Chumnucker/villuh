---
phase: 03-properties-units
plan: 07
subsystem: ui

tags: [react, nextjs, trpc, dnd-kit, s3, tags, unit-statuses]

# Dependency graph
requires:
  - phase: 03-properties-units (Plan 05)
    provides: Properties pages + property-form placeholder Tags slot
  - phase: 03-properties-units (Plan 06)
    provides: Units list/detail pages
  - phase: 03-properties-units (Plan 09)
    provides: tags tRPC router (attach/create/promote/setPropertyTags/organization CRUD)
  - phase: 03-properties-units (Plan 03)
    provides: properties.gallery.* + uploads.presignPropertyImage tRPC routers
  - phase: 03-properties-units (Plan 04)
    provides: unitStatuses tRPC router (create/update/reorder/archive)
provides:
  - PropertyGallery component (S3 upload, dnd-kit drag-reorder, cover badge, delete)
  - TagPicker + ManageTagsDialog (freeform + catalog tags, promote-to-catalog)
  - tag-palette.ts + TagIconColorPicker (shared fixed 14-icon/8-color palette)
  - StatusCatalogPanel (admin-only unit status catalog CRUD + reorder)
  - /settings/unit-statuses route
affects: [04-billing, 05-leasing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixed-palette icon/color picker (tag-palette.ts) shared across tags and unit statuses to enforce D-21/T-03-16"
    - "TagPicker dual-mode: controlled staged-tags array for create flows (no id yet), live tRPC mutations once propertyId exists"
    - "XHR-based upload with progress callback for S3 presigned PUT, since fetch() lacks upload progress events"

key-files:
  created:
    - apps/landlord-web/modules/app/components/properties/property-gallery.tsx
    - apps/landlord-web/modules/app/components/tags/tag-palette.ts
    - apps/landlord-web/modules/app/components/tags/tag-icon-color-picker.tsx
    - apps/landlord-web/modules/app/components/tags/tag-picker.tsx
    - apps/landlord-web/modules/app/components/tags/manage-tags-dialog.tsx
    - apps/landlord-web/modules/app/components/units/status-catalog-panel.tsx
    - apps/landlord-web/app/(app)/settings/unit-statuses/page.tsx
  modified:
    - apps/landlord-web/app/(app)/properties/[propertyId]/page.tsx
    - apps/landlord-web/modules/app/components/properties/property-form.tsx
    - apps/landlord-web/app/(app)/units/page.tsx
    - apps/landlord-web/app/routes.ts

key-decisions:
  - "Gallery mounted on property detail page only (not the edit form) — matches D-02 intent of a persisted-property media UI, and edit page already redirects through detail on save"
  - "TagPicker on property-form stages tags locally during create (no propertyId yet), then persists via setPropertyTags/addFreeform in createProperty's onSuccess — avoids a fake pre-created property just to attach tags"
  - "IconWrench (a UI-SPEC-mandated icon key) is missing from the installed @central-icons-react/all package; cast TagIconKey to PlatformIconName at render sites with an inline comment rather than reworking the icon library, since the fixed enum itself is untouched"
  - "Status catalog reachable from both /settings/unit-statuses (primary settings route) and a Units page header dropdown link — non-admins see neither the dropdown item render conditionally nor the panel body per D-27"

requirements-completed: [PROP-01, PROP-02, UNIT-02]

# Metrics
duration: ~70min
completed: 2026-08-11
---

# Phase 03 Plan 07: Property Gallery, TagPicker, and Unit Status Catalog UI Summary

**S3-backed property photo gallery with dnd-kit drag-reorder, a fixed-palette TagPicker wired into property create/edit with organization-tag promotion, and an admin-only unit status catalog manager.**

## Performance

- **Duration:** ~70 min
- **Tasks:** 2
- **Files modified:** 10 (7 created, 3 modified beyond gallery/tags dirs)

## Accomplishments
- Property detail page now has a full gallery: multi-file upload with per-file S3 presign + PUT (matching Content-Type per Pitfall 1), 10MB/JPEG-PNG-WebP-GIF validation, 25-photo cap, dnd-kit drag-reorder persisted via `gallery.reorder`, Cover badge on index 0, and destructive-confirm delete via `gallery.remove`
- TagPicker replaces the Plan 05 placeholder on the property form and property detail page: fixed 14-icon/8-color palette (no free hex), freeform tag creation, org-catalog suggestions, promote-to-catalog when the user has `write`, and a "Manage tags…" entry into `ManageTagsDialog`
- `ManageTagsDialog` lets `write` users rename, recolor, and delete organization tags, with delete-confirm copy explaining cascade-detach from properties
- `StatusCatalogPanel` gives admins create/rename/reorder/archive over the unit status catalog (seeded statuses are rename-only, not deletable), reachable from `/settings/unit-statuses` and a Units page header dropdown; hidden entirely for non-admins

## Task Commits

Each task was committed atomically:

1. **Task 1: PropertyGallery upload, reorder, delete** - `e86b7fc` (feat)
2. **Task 2: TagPicker + manage tags + unit status catalog UI** - `6ce8634` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `apps/landlord-web/modules/app/components/properties/property-gallery.tsx` - S3 gallery: upload w/ progress, dnd-kit reorder, delete
- `apps/landlord-web/app/(app)/properties/[propertyId]/page.tsx` - mounts PropertyGallery + TagPicker
- `apps/landlord-web/modules/app/components/tags/tag-palette.ts` - fixed icon/color key constants + Tailwind class maps
- `apps/landlord-web/modules/app/components/tags/tag-icon-color-picker.tsx` - reusable fixed-palette icon/color popover
- `apps/landlord-web/modules/app/components/tags/tag-picker.tsx` - dual-mode (staged/live) tag chip picker with promote
- `apps/landlord-web/modules/app/components/tags/manage-tags-dialog.tsx` - org tag CRUD dialog
- `apps/landlord-web/modules/app/components/properties/property-form.tsx` - stages tags on create, live TagPicker on edit
- `apps/landlord-web/modules/app/components/units/status-catalog-panel.tsx` - admin unit status CRUD + reorder
- `apps/landlord-web/app/(app)/units/page.tsx` - admin-only "Manage statuses" link
- `apps/landlord-web/app/(app)/settings/unit-statuses/page.tsx` - hosts StatusCatalogPanel
- `apps/landlord-web/app/routes.ts` - added `settingsUnitStatuses` route (inbox route line pre-existed from unrelated concurrent work and was preserved untouched)

## Decisions Made
- Gallery lives on the property detail page only; the edit page continues to handle name/address/tags/notes and does not duplicate the media UI
- `TagPicker` is a single component with two call signatures: `{ propertyId }` (live, tRPC-backed) for edit/detail contexts, and `{ value, onChange }` (controlled array) for the create-property form before a `propertyId` exists; `PropertyForm`'s `createProperty.onSuccess` persists any staged tags via `tags.setPropertyTags` + `tags.addFreeform`
- Icon palette fidelity: cast `TagIconKey`/`UnitStatusIconKey` values to `PlatformIconName` where `IconWrench` (a UI-SPEC-mandated key) doesn't yet exist in the installed icon package, documented inline rather than expanding scope to patch the icon library

## Deviations from Plan

None - plan executed exactly as written. (Minor implementation-detail adjustments — XHR instead of fetch for upload progress, useMemo for the tags array to satisfy exhaustive-deps — were normal implementation choices, not scope deviations.)

## Issues Encountered
- The main working tree had unrelated in-flight changes from another process (an inbox nav addition and a sidebar/auth route restructuring: `routes.ts` inbox line, `sidebar-nav.ts` → `sidebar-config.ts`, `(auth)/auth/*` → `app/auth/*`). These were left completely untouched; only this plan's specific files were staged and committed across both task commits (verified via `git status --short` before and after each commit).
- `IconWrench` (a fixed UI-SPEC palette key) is absent from the installed `@central-icons-react/all` package — a pre-existing gap noted in Plan 06's summary. Worked around with a type cast at render sites; the underlying fixed enum (`TAG_ICON_KEYS`/unit status icon keys) is unaffected, so no invalid icons can be selected once the package gap is fixed upstream.

## Next Phase Readiness
- PROP-01, PROP-02, and UNIT-02 UI surfaces are now complete per UI-SPEC screens 3/7/8
- No blockers for subsequent phases

---
*Phase: 03-properties-units*
*Completed: 2026-08-11*

## Self-Check: PASSED

All 7 created files verified present on disk; both task commits (`e86b7fc`, `6ce8634`) verified in `git log`.
