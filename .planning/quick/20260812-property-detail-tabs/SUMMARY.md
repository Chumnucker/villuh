---
status: complete
completed: 2026-08-12
---

Property detail page redesigned into 5 route-backed tabs (About / Units /
Gallery / Tenants / Analytics). Ported metric-card + bklit chart library and
a pan/zoom lightbox into `@villuh/ui`; installed a Base UI tabs primitive via
shadcn (`@coss/p-tabs-7`) with backward-compatible aliases. Units tab reuses
the shared `UnitsList` table locked to one property. Typecheck, lint, and
`next build` all pass. See PLAN.md for full decision log.

**Outstanding:** no live authenticated browser walkthrough was done in this
session (no browser tooling available) — worth a manual pass before
considering this fully verified.
