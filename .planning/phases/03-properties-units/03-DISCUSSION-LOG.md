# Phase 3: Properties & Units - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-11
**Phase:** 3-properties-units
**Areas discussed:** Scope cut, Nav model, Property form fields, Unit status, Delete rules, S3 gallery UX, Mapbox address UX, Markdown notes, Tag promote permission, Property dashboard, Plan-limit UX

---

## Scope cut

| Option | Description | Selected |
|--------|-------------|----------|
| Full PROP/UNIT with explicit deferrals | Gallery in; PROP-04/05 out; UNIT-03/04 stub tabs | ✓ |
| Thin CRUD only | Defer gallery and most extras | |
| Cut more aggressively | Minimal properties only | |

**User's choice:** Full intent with gallery in, PROP-04/05 out, UNIT-03/04 stub empty history tabs.
**Notes:** Later also deferred PROP-03 dashboard and UNIT-05 (needs leases).

---

## Nav model

| Option | Description | Selected |
|--------|-------------|----------|
| Units: sidebar only | `/units` only | |
| Units: nested only | Under property only | |
| Units: both | Sidebar + nested under property | ✓ |
| After create property → list | Stay on list | |
| After create property → detail | Go to property detail | ✓ |
| Properties list = table | Dense table | |
| Properties list = cards | Card grid | ✓ |
| Unit create: property detail only | | |
| Unit create: both + picker on Units page | | ✓ |

**User's choice:** Both unit entry points; create → detail; cards; unit create from property detail and Units page with property picker.

---

## Property form fields

| Option | Description | Selected |
|--------|-------------|----------|
| Structured address + Mapbox | + optional line2 | ✓ |
| Freeform address string | Single text field | |
| Phone required | | |
| Phone optional | | ✓ |
| Notes optional markdown | | ✓ |
| Tags freeform + org catalog + promote + icon/color | | ✓ |

**User's choice:** Structured Mapbox address; optional phone/notes; hybrid tags with icon+color.

---

## Unit status

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed three statuses only | Available / Occupied / Maintenance | |
| Org custom + seed defaults | | ✓ |
| Who edits catalog: owner/admin | | ✓ |
| Phase 3 manual; design for Phase 4 auto Occupied | | ✓ |
| UI: color badge + icon | | ✓ |

**User's choice:** Custom statuses with seeds; owner/admin edit; manual now / auto later; badge+icon.

---

## Delete rules

| Option | Description | Selected |
|--------|-------------|----------|
| Soft archive property | | ✓ |
| Hard delete property | | |
| Cascade soft-archive units with property | | ✓ |
| Soft archive unit | | ✓ |
| Confirm: type name + list affected + archive vs permanent copy | | ✓ |

**User's choice:** Soft archive everywhere; cascade units with property; heavy confirm dialog.

---

## S3 gallery UX

| Option | Description | Selected |
|--------|-------------|----------|
| Max 25 images | | ✓ |
| Cover = first in order; drag reorder | | ✓ |
| Common image types; 10MB max | | ✓ |
| Delete = immediate S3 + DB | | ✓ |

**User's choice:** As above.

---

## Mapbox address UX

| Option | Description | Selected |
|--------|-------------|----------|
| Autocomplete → fill structured fields | | ✓ |
| Lat/lng required when Mapbox used | | ✓ |
| Any Mapbox-supported country | | ✓ |
| Manual structured fallback if Mapbox fails | | ✓ |

**User's choice:** As above.

---

## Markdown notes

| Option | Description | Selected |
|--------|-------------|----------|
| TipTap WYSIWYG | | ✓ |
| Markdown textarea | | |
| Basic subset (bold/italic/lists/links/headings) | | ✓ |
| Server-side sanitize always | | ✓ |
| Empty OK; placeholder “Add notes…” | | ✓ |

**User's choice:** `1.3 TipTap, 2.1, 3.1, 4.2` (TipTap / basic / server sanitize / placeholder).

---

## Tag promote permission

| Option | Description | Selected |
|--------|-------------|----------|
| Promote: `write` | | ✓ |
| Promote: `admin` only | | |
| Edit/delete catalog: same as promote | | ✓ |
| Delete in use: cascade detach + delete tag | | ✓ |
| Icon/color: fixed palette | | ✓ |

**User's choice:** `1.2, 2.1, 3.3, 4.1`.

---

## Property dashboard

| Option | Description | Selected |
|--------|-------------|----------|
| Build Phase 3 stats from unit status / base rent | | |
| Skip / defer until more product exists | | ✓ |

**User's choice:** Skip dashboard for now; revisit when leases/tenants make occupancy/rent/alerts meaningful.
**Notes:** PROP-03 deferred explicitly; do not ship a placeholder stats row.

---

## Plan-limit UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline disabled create + message | | |
| Upgrade modal on submit | | |
| Reusable PlanLimitGate wrapping triggers; at-limit opens LimitReachedDialog instead of create | | ✓ |
| Quotas from early-loaded org/`me` cache; pass resource type only | | ✓ |
| Server 402 PLAN_LIMIT still enforced | | ✓ |

**User's choice:** Productized reusable gate + dialog; once-fetched quotas; UI + server (4.1).
**Notes:** User emphasized polish and reuse (wrap button, know action type, upsell to billing).

---

## Claude's Discretion

- TipTap package/toolbar details within locked subset
- Mapbox SDK / env wiring
- Soft-archive column naming
- PlanLimitGate API shape (HOC vs render-prop vs provider)
- Fixed palette contents for tags
- Empty-state copy for stub history tabs

## Deferred Ideas

- PROP-03 property dashboard
- PROP-04 / PROP-05 lease expiry alerts & renewal notices
- UNIT-03 / UNIT-04 live history (stub tabs only in Phase 3)
- UNIT-05 prorated rent (needs leases)
