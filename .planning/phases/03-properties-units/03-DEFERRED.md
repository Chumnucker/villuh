# Phase 3 — Deferred Requirements

> Explicit non-implementation record. These requirements are **intentionally out of Phase 3's
> build** — not oversights. No feature code, routes, schema, or UI exists for them in this
> phase. Revisit once the noted dependency (leases/tenants, Phase 7 comms) lands.

---

## Deferred out of build

### PROP-03 — Property dashboard (stats/alerts)

**Requirement:** Landlord can view a property dashboard showing total units, occupancy, monthly
rent total, and alerts.

**Status:** Not built. No stats/alerts strip exists on the property detail page.

**Reason:** CONTEXT decision **D-05** — deferred until more of the product exists (leases,
tenants, rent ledger) and product vision for "what to show" is clearer. Building a dashboard on
top of properties/units alone would show meaningless zeros for occupancy/rent.

**Revisit:** After Phase 4 (leases/tenants) and/or Phase 6 (rent ledger) land real signal.

---

### PROP-04 — Per-property lease expiry alert threshold

**Requirement:** Landlord can configure a per-property lease expiry alert threshold (days
before expiry).

**Status:** Not built. No threshold field, settings UI, or alert logic exists.

**Reason:** CONTEXT decision **D-03** — requires lease records (start/end dates), which don't
exist until Phase 4.

**Revisit:** Phase 4 (Tenants, Leases & Documents).

---

### PROP-05 — Automatic tenant renewal notices

**Requirement:** System automatically sends tenant renewal notices via email/SMS when lease
expiry threshold is reached.

**Status:** Not built. No notice scheduling, template, or send logic exists.

**Reason:** CONTEXT decision **D-03** — requires both lease records (Phase 4) and the
communications infrastructure (Resend/Twilio, Phase 7).

**Revisit:** Phase 7 (Communications), after Phase 4 lease records exist.

---

### UNIT-05 — Mid-month prorated rent

**Requirement:** System auto-calculates prorated rent when a lease starts mid-month; landlord
can override.

**Status:** Not built. No proration calculation, override field, or lease-start hook exists.

**Reason:** CONTEXT decision **D-06** — proration is computed from lease start date, which
doesn't exist until lease records ship in Phase 4.

**Revisit:** Phase 4 (Tenants, Leases & Documents).

---

## Delivered as stubs only (not deferred, but not "live")

### UNIT-03 / UNIT-04 — Rent history / Tenant history tabs

**Requirement:** Landlord can view rent history and tenant history for a unit.

**Status:** Delivered as **empty stub tabs only** on `apps/landlord-web/modules/app/components/units/unit-detail-tabs.tsx`
(Overview / Rent history / Tenant history tabs installed via shadcn `tabs`, Plan 06). The Rent
history and Tenant history tabs render static empty-state copy — no query, no live data, no fake
rows.

**Reason:** CONTEXT decision **D-04** — tabs exist for navigation continuity so the unit detail
page shape doesn't change again in Phase 4+, but there is no rent ledger (Phase 6) or lease/tenant
data (Phase 4) to back them yet.

**Revisit:** Wire live data once Phase 4 (tenant history) and Phase 6 (rent history) ship.

---

## Requirement coverage note

`REQUIREMENTS.md` marks UNIT-03/UNIT-04 as complete because the UI-SPEC scope for Phase 3
explicitly limited them to stub tabs (see `03-UI-SPEC.md` scope note and `03-CONTEXT.md` D-04) —
"complete" here means "Phase 3's stub-tab scope is complete," not "live history is implemented."
PROP-03, PROP-04, PROP-05, and UNIT-05 remain unchecked in `REQUIREMENTS.md` and are correctly
tracked as pending against their target phases (Phase 4/6/7) in the Traceability table.
