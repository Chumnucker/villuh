# Requirements: Villuh Lease

**Defined:** 2026-04-29
**Core Value:** A landlord can onboard a tenant from zero to signed lease in one structured flow — without touching email, a spreadsheet, or a separate e-sign tool.

## v1 Requirements

### Auth & Billing

- [ ] **AUTH-01**: Landlord can sign up and log in with email/password or Google OAuth
- [ ] **AUTH-02**: Landlord can invite team members and assign roles: owner / manager / viewer with configurable permissions
- [ ] **AUTH-03**: Platform enforces 3 subscription tiers (Starter / Growth / Pro) with per-tier property limits, feature gates, and per-unit pricing
- [ ] **AUTH-04**: New landlords get a 30-day free trial; platform hard-blocks creation when plan limits are hit
- [ ] **AUTH-05**: Landlord is billed per active unit via Stripe metered billing with per-tier unit rates
- [ ] **AUTH-06**: Landlord can connect their Stripe account to receive tenant deposit payments (Stripe Connect)
- [ ] **AUTH-07**: Landlord can view invoices, change plan, and see usage from within the app billing UI
- [ ] **AUTH-08**: New landlord is guided through property → unit → tenant setup wizard on first login
- [ ] **AUTH-09**: Landlord can reset their password via email link

### Properties

- [ ] **PROP-01**: Landlord can create, edit, and delete properties with name, address, phone, notes, and image gallery (S3)
- [ ] **PROP-02**: Landlord can tag properties with custom labels for organization
- [ ] **PROP-03**: Landlord can view a property dashboard showing total units, occupancy, monthly rent total, and alerts
- [ ] **PROP-04**: Landlord can configure a per-property lease expiry alert threshold (days before expiry)
- [ ] **PROP-05**: System automatically sends tenant renewal notices via email/SMS when lease expiry threshold is reached

### Units

- [ ] **UNIT-01**: Landlord can create, edit, and delete units with property, label, square footage, base rent, and availability status
- [ ] **UNIT-02**: Landlord can define custom availability statuses (defaults: Available / Occupied / Maintenance)
- [ ] **UNIT-03**: Landlord can view rent history for a unit (all payments ever recorded against it)
- [ ] **UNIT-04**: Landlord can view tenant history for a unit (chronological list of previous tenants)
- [ ] **UNIT-05**: System auto-calculates prorated rent when a lease starts mid-month; landlord can override

### Tenants

- [ ] **TENT-01**: Landlord can create and edit tenant profiles with name, email, phone, assigned unit, lease status, and onboarding status
- [ ] **TENT-02**: Landlord can add multiple co-tenants to a single lease
- [ ] **TENT-03**: Landlord can view an activity timeline per tenant showing all system events, document views, and logins
- [ ] **TENT-04**: System archives tenant and lease as inactive when the lease ends while retaining all data
- [ ] **TENT-05**: Landlord can import tenants, leases, units, and rent history from CSV via a guided wizard
- [ ] **TENT-06**: Landlord can export all data entities as a full data export

### Leases & Documents

- [ ] **LEASE-01**: Landlord can create a lease record with tenant, unit, rent amount, due day, start/end date, status, and grace period
- [ ] **LEASE-02**: Landlord can set per-lease activation mode: auto (activates on start date) / manual / scheduled
- [ ] **LEASE-03**: Landlord can create and categorize documents as Lease, Addendum, Notice, or Misc
- [ ] **LEASE-04**: Landlord can attach addendums to a lease entity in ordered sequence
- [ ] **LEASE-05**: Landlord can record a mid-lease rent change via addendum which updates the active rent amount
- [ ] **LEASE-06**: Documents progress through a defined lifecycle: draft → uploaded → sent_for_signature → viewed → signed → archived
- [ ] **LEASE-07**: Landlord can send documents for e-signature using either DocuSign templates or ad-hoc PDF upload
- [ ] **LEASE-08**: Landlord can configure multi-party signing order per document with optional landlord countersign
- [ ] **LEASE-09**: Landlord can configure co-tenant signing order per document
- [ ] **LEASE-10**: When a signer declines, the step is marked failed, landlord is notified, and landlord can resend (new envelope) or revoke
- [ ] **LEASE-11**: Landlord can void an active DocuSign envelope from within Villuh
- [ ] **LEASE-12**: Signed PDFs are stored in S3 with one-click download and in-browser preview
- [ ] **LEASE-13**: Tenant can preview the PDF inline on their invite page before the DocuSign signing step

### Onboarding Flow Engine

- [ ] **FLOW-01**: Landlord can build an onboarding flow with ordered steps and conditional branching (conditions_json)
- [ ] **FLOW-02**: Flow steps support 5 types: signature_required (DocuSign), acknowledgment, document_view_only, form_fill (landlord-defined fields), payment (Stripe Checkout → Stripe Connect)
- [ ] **FLOW-03**: Landlord can save and reuse a flow template across any tenant/unit combination
- [ ] **FLOW-04**: Steps execute sequentially; flow is locked from editing while an instance is active
- [ ] **FLOW-05**: Each tenant has one onboarding instance; landlord can reset and re-trigger it
- [ ] **FLOW-06**: Landlord manually triggers onboarding by clicking "Start onboarding" per tenant
- [ ] **FLOW-07**: Landlord can preview the tenant invite experience from the flow builder before sending
- [ ] **FLOW-08**: Tenant receives a magic-link invite page that renders the configured flow with Villuh + landlord branding
- [ ] **FLOW-09**: Landlord can configure invite expiry (N days) and can resend, revoke, or regenerate the invite link
- [ ] **FLOW-10**: Tenant identity is verified via magic link only — no account creation required

### Rent Ledger

- [ ] **LEDG-01**: System auto-generates a monthly rent entry for each active lease on the due date
- [ ] **LEDG-02**: Landlord can configure a grace period per lease before a payment is marked late
- [ ] **LEDG-03**: System marks entries overdue daily via a Railway Cron job after due_day + grace period
- [ ] **LEDG-04**: Landlord can record manual payments with a fixed method enum (Zelle / Venmo / Cash / Check / Bank Transfer / Other)
- [ ] **LEDG-05**: Landlord can record partial payments; system tracks the remaining balance
- [ ] **LEDG-06**: System calculates and adds late fees automatically after the grace period
- [ ] **LEDG-07**: Landlord can apply structured adjustments to the ledger (credit, late fee waiver, partial payment) with reason codes

### Communications

- [ ] **COMM-01**: Landlord can send email and SMS messages to individual tenants (Resend + Twilio)
- [ ] **COMM-02**: Landlord can view a two-way threaded conversation history per tenant
- [ ] **COMM-03**: System receives inbound tenant email/SMS replies and routes them to the correct thread (routing strategy TBD)
- [ ] **COMM-04**: Landlord can bulk-send a message to multiple selected tenants in one action
- [ ] **COMM-05**: Landlord can create and use message templates with variable chips ({{tenant_name}}, {{rent_amount}}, etc.)
- [ ] **COMM-06**: Landlord can use AI-assisted message drafting (Claude) with full tenant + lease + payment context and tone learning
- [ ] **COMM-07**: System automatically handles TCPA/CAN-SPAM opt-out requests via Resend/Twilio
- [ ] **COMM-08**: Landlord has an in-app notification system (bell icon, unread count, notification feed)
- [ ] **COMM-09**: Landlord can configure notification preferences per event type across in-app, email, and SMS channels

### Reporting

- [ ] **REPT-01**: Landlord can view a reports page with revenue summary, payment trends, and occupancy rate with date-range filtering

### Search

- [ ] **SRCH-01**: Landlord can search across tenants, units, and properties by name from a global search bar

### Operator Admin

- [ ] **ADMN-01**: Operator can impersonate any landlord account, override billing, and delete data from an admin panel
- [ ] **ADMN-02**: Operator can view all accounts, subscriptions, and usage metrics

### Settings

- [ ] **SETT-01**: Landlord can manage profile, billing, connected accounts (Stripe Connect, DocuSign), and notification preferences from settings
- [ ] **SETT-02**: Landlord can view a personal audit log of all account activity in settings

---

## v2 Requirements

### Tenant Portal

- **PORT-01**: Tenant can create an account and log in to a persistent portal
- **PORT-02**: Tenant can view their lease documents from the portal
- **PORT-03**: Tenant can submit maintenance requests from the portal
- **PORT-04**: Tenant can view payment history from the portal

### Maintenance

- **MAINT-01**: Landlord can receive and manage maintenance requests
- **MAINT-02**: Landlord can assign maintenance requests to vendors
- **MAINT-03**: Tenant can track status of submitted maintenance requests

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Tenant screening / background checks | FCRA compliance liability; different product risk profile |
| Listing syndication (Zillow, Apartments.com) | API maintenance burden; unit economics don't work at 1–50 scale |
| Full accounting / bookkeeping (P&L, depreciation) | Different product category; landlords use Stessa/QuickBooks |
| Legal contract / lease generation | Jurisdiction variance, legal liability if clause is wrong |
| Marketing landing site | App-only in v1 |
| SMS/email inbound routing strategy | Architecture TBD — will be designed during comms phase |
| Cron monitoring / ops alerting | Ops concern for post-launch |
| Vendor / contractor management | Two-sided marketplace problem |
| ACH / bank transfer processing (Villuh as processor) | Requires money transmitter license |
| AI-automated lease drafting | Legal liability in v1 |
| Owner portal (multi-owner properties) | Rare at 1–50 units; role-based access covers the common case |

---

## Traceability

*Updated during roadmap creation — 2026-04-29.*

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| AUTH-06 | Phase 2 | Pending |
| AUTH-07 | Phase 2 | Pending |
| AUTH-08 | Phase 2 | Pending |
| AUTH-09 | Phase 2 | Pending |
| PROP-01 | Phase 3 | Pending |
| PROP-02 | Phase 3 | Pending |
| PROP-03 | Phase 3 | Pending |
| PROP-04 | Phase 3 | Pending |
| PROP-05 | Phase 3 | Pending |
| UNIT-01 | Phase 3 | Pending |
| UNIT-02 | Phase 3 | Pending |
| UNIT-03 | Phase 3 | Pending |
| UNIT-04 | Phase 3 | Pending |
| UNIT-05 | Phase 3 | Pending |
| TENT-01 | Phase 4 | Pending |
| TENT-02 | Phase 4 | Pending |
| TENT-03 | Phase 4 | Pending |
| TENT-04 | Phase 4 | Pending |
| TENT-05 | Phase 4 | Pending |
| TENT-06 | Phase 4 | Pending |
| LEASE-01 | Phase 4 | Pending |
| LEASE-02 | Phase 4 | Pending |
| LEASE-03 | Phase 4 | Pending |
| LEASE-04 | Phase 4 | Pending |
| LEASE-05 | Phase 4 | Pending |
| LEASE-06 | Phase 4 | Pending |
| LEASE-07 | Phase 4 | Pending |
| LEASE-08 | Phase 4 | Pending |
| LEASE-09 | Phase 4 | Pending |
| LEASE-10 | Phase 4 | Pending |
| LEASE-11 | Phase 4 | Pending |
| LEASE-12 | Phase 4 | Pending |
| LEASE-13 | Phase 4 | Pending |
| FLOW-01 | Phase 5 | Pending |
| FLOW-02 | Phase 5 | Pending |
| FLOW-03 | Phase 5 | Pending |
| FLOW-04 | Phase 5 | Pending |
| FLOW-05 | Phase 5 | Pending |
| FLOW-06 | Phase 5 | Pending |
| FLOW-07 | Phase 5 | Pending |
| FLOW-08 | Phase 5 | Pending |
| FLOW-09 | Phase 5 | Pending |
| FLOW-10 | Phase 5 | Pending |
| LEDG-01 | Phase 6 | Pending |
| LEDG-02 | Phase 6 | Pending |
| LEDG-03 | Phase 6 | Pending |
| LEDG-04 | Phase 6 | Pending |
| LEDG-05 | Phase 6 | Pending |
| LEDG-06 | Phase 6 | Pending |
| LEDG-07 | Phase 6 | Pending |
| COMM-01 | Phase 7 | Pending |
| COMM-02 | Phase 7 | Pending |
| COMM-03 | Phase 7 | Pending |
| COMM-04 | Phase 7 | Pending |
| COMM-05 | Phase 7 | Pending |
| COMM-06 | Phase 7 | Pending |
| COMM-07 | Phase 7 | Pending |
| COMM-08 | Phase 7 | Pending |
| COMM-09 | Phase 7 | Pending |
| REPT-01 | Phase 8 | Pending |
| SRCH-01 | Phase 8 | Pending |
| ADMN-01 | Phase 8 | Pending |
| ADMN-02 | Phase 8 | Pending |
| SETT-01 | Phase 2 | Pending |
| SETT-02 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 70 total
- Mapped to phases: 70 (roadmap complete)
- Unmapped: 0 ✓

**Phase distribution:**
- Phase 1 (Infrastructure Foundation): 0 functional requirements (foundational scaffolding)
- Phase 2 (Auth & Billing): 11 requirements — AUTH-01–09, SETT-01, SETT-02
- Phase 3 (Properties & Units): 10 requirements — PROP-01–05, UNIT-01–05
- Phase 4 (Tenants, Leases & Documents): 19 requirements — TENT-01–06, LEASE-01–13
- Phase 5 (Onboarding Flow Engine): 10 requirements — FLOW-01–10
- Phase 6 (Rent Ledger): 7 requirements — LEDG-01–07
- Phase 7 (Communications): 9 requirements — COMM-01–09
- Phase 8 (Reporting, Search & Admin): 4 requirements — REPT-01, SRCH-01, ADMN-01–02

---
*Requirements defined: 2026-04-29*
*Last updated: 2026-04-29 after roadmap creation (traceability populated)*
