# Domain Pitfalls

**Domain:** Landlord SaaS / Multi-tenant B2B SaaS (Villuh Lease)
**Researched:** 2026-04-29
**Sources:** Context7 (Better Auth v1.3.x, Drizzle ORM v0.36+, Stripe Node v19+), PROJECT.md, domain knowledge

---

## Critical Pitfalls

Mistakes that cause data leaks, rewrites, or irreversible production incidents.

---

### Pitfall 1: RLS Bypassed by the App's Own Database Role

**What goes wrong:** Postgres RLS only applies when queries run under a role that is NOT the table owner and NOT a superuser. The standard Drizzle connection string — `postgresql://postgres:...` or any owner-level role — silently bypasses every policy because owners are always exempt from RLS. Every row is visible to every landlord at the ORM layer even though policies "exist."

**Why it happens:** Developers enable RLS, write policies, then test with the same database owner credential used to run migrations. Everything appears to work; the data is isolated in tests only because the test fixtures happened to be separate. In production, all landlords share the same owner connection pool and see each other's data.

**Consequences:** Complete multi-tenant data isolation failure. Regulatory/legal exposure. No recovery path other than redesigning the connection strategy and re-auditing all queries.

**Prevention:**
- Create a separate, non-owner Postgres role for the application (e.g., `villuh_app`). Grant only `SELECT/INSERT/UPDATE/DELETE` on app tables, not ownership. Enable RLS on all tables. The migration role stays as owner; the runtime role is `villuh_app`.
- Set the tenant context before each query using `SET LOCAL app.current_landlord_id = '...'` inside a transaction, and write policies that read `current_setting('app.current_landlord_id')`. Drizzle supports this via `db.transaction(async (tx) => { await tx.execute(sql\`SET LOCAL ...\`); ... })`.
- Confirm policies are active by running `SELECT * FROM pg_policies` and spot-checking cross-landlord queries in a dev environment logged in as `villuh_app`.

**Detection warning signs:** Queries run as the database owner. `pg_roles` shows your app's connection role is the table owner. No integration tests that assert landlord A cannot read landlord B's records.

**Phase:** Auth & Billing setup (Phase 1) — the role architecture must be decided before the first table is created.

---

### Pitfall 2: RLS and Drizzle Migrations Conflict

**What goes wrong:** Drizzle's `migrate()` function and `drizzle-kit push` must run as the owner role (to CREATE TABLE, ALTER TABLE, add policies). If you configure migrations to run using the same restricted `villuh_app` role you use at runtime, migrations fail. If you configure them using the owner role at runtime, RLS is bypassed.

**Why it happens:** The application uses a single `DATABASE_URL`. It is easy to give migrations and the live app the same credentials, especially on Railway where one env var is conventional.

**Consequences:** Either migrations break in CI, or you silently run the app with an owner role that bypasses RLS. Both outcomes cause problems.

**Prevention:**
- Maintain two connection strings: `DATABASE_URL` (owner, used only by migrations and `drizzle-kit`) and `DATABASE_APP_URL` (restricted `villuh_app` role, used by the Hono server). Never swap them.
- The Drizzle docs explicitly show using `max: 1` for the migration client and a separate pool for the app client — treat this as mandatory, not optional.

**Detection warning signs:** A single `DATABASE_URL` environment variable used for both Drizzle migrate and the Hono server.

**Phase:** Phase 1 (DB setup).

---

### Pitfall 3: Two Stripe Webhook Endpoints, Two Secrets — Conflation Is Fatal

**What goes wrong:** Villuh has two completely separate Stripe integrations: (A) Stripe Subscriptions for landlords paying Villuh, and (B) Stripe Connect for tenants paying landlords via Stripe Checkout. Each integration produces different event types and requires a different webhook secret. Conflating them — registering one endpoint that attempts to verify both — causes signature verification failures or, worse, silently processes events from the wrong integration.

**Why it happens:** Developers register one `/webhooks/stripe` endpoint because "it's all Stripe." The Better Auth Stripe plugin handles subscription events (customer.subscription.created, etc.). Connect events (account.updated, checkout.session.completed) come from a different Stripe-Account context and use a different webhook secret.

**Consequences:**
- Connect webhook secret used to verify subscription events → `400 Webhook Error` every time → Stripe retries → noise and missed events.
- Signature check skipped silently → fraudulent event processing.
- Missing `account.updated` events → landlord Connect account onboarding state never recorded → landlord can't receive deposits.

**Prevention:**
- Two webhook endpoints: `/webhooks/stripe/subscriptions` (handles Better Auth Stripe plugin events) and `/webhooks/stripe/connect` (handles Connect events).
- Two separate `STRIPE_WEBHOOK_SECRET` and `STRIPE_CONNECT_WEBHOOK_SECRET` environment variables.
- The Connect endpoint must verify using `stripe.webhooks.constructEvent(body, sig, connectWebhookSecret)` separately from the subscription endpoint.
- Register the Connect webhook in the Stripe Dashboard under "Connect" → "Webhooks", not the standard webhook list.

**Detection warning signs:** One webhook route handling all Stripe events. A single `STRIPE_WEBHOOK_SECRET` env var.

**Phase:** Auth & Billing (Phase 1) — architecture decision must happen before either integration is built.

---

### Pitfall 4: Stripe Connect Account Not Ready When Tenant Pays

**What goes wrong:** The onboarding flow's payment step creates a Stripe Checkout Session directed to the landlord's connected account. If the landlord's Connect account is not fully onboarded (missing required KYC fields, not charges-enabled), the Checkout Session creation call fails with a Stripe error that surfaces to the tenant as a broken onboarding experience.

**Why it happens:** Stripe Connect onboarding for Express accounts is asynchronous. The landlord clicks through the Stripe-hosted onboarding UI and lands on the `return_url`, but "returned" does not mean "onboarding complete." The `account.updated` webhook with `charges_enabled: true` is the authoritative signal. Many developers check `return_url` arrival as the completion signal.

**Consequences:** Landlord creates a payment step in their onboarding flow, sends tenant invite, tenant reaches payment step — Stripe throws an error. Tenant experience is broken. Landlord is confused because they "completed" Connect onboarding.

**Prevention:**
- Store `stripe_connect_account_id` and `stripe_connect_charges_enabled` (boolean) on the landlord record.
- The `account.updated` webhook handler (on the Connect endpoint) sets `stripe_connect_charges_enabled = true` when `event.data.object.charges_enabled === true`.
- Block payment step creation in the flow builder UI if `stripe_connect_charges_enabled` is false, with clear messaging directing the landlord to complete Connect setup.
- Block the payment step execution at runtime (when sending the tenant invite) with the same check, returning a clear error to the landlord, not the tenant.

**Detection warning signs:** Connect account status checked only at onboarding return URL, not from `account.updated` webhook. No `charges_enabled` column in the landlord table.

**Phase:** Onboarding Flow Engine phase — payment step creation must gate on this status.

---

### Pitfall 5: DocuSign Envelope Status Desync (Webhook Gaps)

**What goes wrong:** The Villuh document lifecycle (`draft → sent_for_signature → viewed → signed → archived`) is driven by DocuSign Connect webhook events. If a webhook is missed (network blip, Railway deploy during delivery, DocuSign retry window exhausted), the envelope status in Villuh's DB stays in `sent_for_signature` even though the document has been signed. The landlord sees "pending" forever; the onboarding flow never advances.

**Why it happens:** DocuSign retries failed webhooks, but only a limited number of times. Railway's deployment model can cause brief downtime. In the PROJECT.md, the decision is "provider-level retries only, no custom retry infrastructure in v1" — this is a conscious tradeoff, but the failure mode must be anticipated.

**Consequences:** Onboarding flows stuck at signature step. Landlord manually checking DocuSign dashboard. Tenant confusion. Landlord loses confidence in the product.

**Prevention (within the v1 constraint of no custom retry infra):**
- Implement a "sync envelope status" reconciliation path: a Hono endpoint or admin action that calls `envelopes.get(envelopeId)` to pull current DocuSign status on demand. Expose this as a "Refresh Status" button on the document detail page and for stuck onboarding flow steps.
- Log every received DocuSign webhook with its event type and timestamp for debugging.
- In the landlord UI, show the last webhook received time on a stuck step so the landlord knows whether the system has lost contact.

**Detection warning signs:** No "sync from DocuSign" manual reconciliation path. No webhook receipt log. Stuck onboarding flows with no operator recovery tool.

**Phase:** Documents & DocuSign phase. Plan the reconciliation endpoint in the same sprint as webhook handling.

---

### Pitfall 6: DocuSign Template vs. Ad-Hoc Upload — Two Different Code Paths

**What goes wrong:** DocuSign's Template API and the Envelopes API (for ad-hoc PDF upload) are architecturally different. Template-based envelopes pre-configure tabs (field positions) in the DocuSign UI; ad-hoc envelopes require specifying recipient roles and anchors differently. Developers start with templates, build all the envelope creation logic around templates, then discover ad-hoc PDF upload requires a fundamentally different payload structure — leading to a rewrite of the envelope creation service.

**Why it happens:** The PROJECT.md requires both "template library and ad-hoc PDF upload." These are not the same API call with a different parameter; they follow different envelope creation patterns.

**Consequences:** Rewriting the DocuSign service mid-phase. Integration timeline doubles.

**Prevention:**
- Design an `EnvelopeCreationStrategy` abstraction from day one with two implementations: `TemplateEnvelopeStrategy` and `AdHocEnvelopeStrategy`. Both produce the same internal representation; the strategy handles the DocuSign API differences.
- Build and test both strategies in the same sprint — do not defer ad-hoc until after templates work.
- The DocuSign developer account setup is required before any code can be tested end-to-end; do not begin DocuSign integration sprint without sandbox credentials.

**Detection warning signs:** A single `createEnvelope()` function with a growing `if (isTemplate)` branch. Ad-hoc upload deferred to "later."

**Phase:** Documents & DocuSign phase.

---

### Pitfall 7: Onboarding Flow Engine — Mutable State During Active Execution

**What goes wrong:** The flow builder allows landlords to define ordered steps. If a landlord edits a flow (reorders steps, deletes a step, changes conditions_json) while a tenant is mid-execution, the tenant's `current_step_index` points to the wrong step or a deleted step. The tenant sees a broken invite page or gets stuck.

**Why it happens:** The PROJECT.md correctly states "flow locked when active." But "locked" must be enforced at the data layer, not just the UI layer. If the lock is only a UI flag, a race condition (two browser tabs, API call bypass) can corrupt an active instance.

**Consequences:** Tenant mid-onboarding hits a null step reference. Onboarding instance corrupted. Manual operator intervention required.

**Prevention:**
- Enforce the flow lock at the database layer: a `status` column on the flow template (`draft | active | archived`). A Drizzle-level check constraint or a Hono middleware guard prevents any UPDATE to flow steps when any associated onboarding instance is in `in_progress` status.
- Store a `snapshot_json` of the flow definition on the `onboarding_instance` row at the moment the landlord triggers onboarding. The tenant invite page renders from `snapshot_json`, not from the live flow definition. This makes the lock a convenience; the snapshot is the source of truth for the active execution.
- The "reset and reuse" feature (one instance per tenant) must create a new snapshot, not resume the old one.

**Detection warning signs:** Invite page rendering by joining to live flow step rows rather than a stored snapshot. No database-level flow lock enforcement.

**Phase:** Onboarding Flow Engine phase (core architecture decision for the engine).

---

### Pitfall 8: Onboarding Flow Resumability — Magic Link Session vs. App Session

**What goes wrong:** The tenant invite page uses a magic link (no separate account). The tenant visits, completes step 1, closes the browser, then returns via the same magic link. If the magic link was single-use (consumed on first visit), the tenant is locked out of their partially completed onboarding. If the magic link creates a Better Auth session that expires before the tenant finishes, same result.

**Why it happens:** Better Auth's magic link plugin defaults to `allowedAttempts: 1` and `expiresIn: 300` (5 minutes). These defaults are designed for login flows, not multi-step onboarding sessions that might span hours or days.

**Consequences:** Tenant can't resume onboarding. Landlord must manually resend the invite. Poor tenant experience. Landlord support burden.

**Prevention:**
- The invite page must NOT be tied to a one-time-use magic link for authentication. Instead:
  - The magic link's only purpose is to establish an `onboarding_session` token (stored in DB with the tenant's email, instance ID, expiry matching the invite expiry configured by the landlord).
  - Subsequent visits use a URL parameter (`?token=<onboarding_token>`) that is validated against the DB on every page load — it is valid as many times as needed until it expires or is revoked.
  - This is separate from Better Auth's magic link plugin (which should not be used for tenant onboarding).
- The landlord-configurable invite expiry (N days) maps to the `onboarding_session` token expiry, not to a Better Auth session.

**Detection warning signs:** Using Better Auth's `magicLink` plugin for tenant invite verification. `allowedAttempts: 1` on the invite token.

**Phase:** Onboarding Flow Engine phase — the invite token architecture must be designed before the invite page is built.

---

## Moderate Pitfalls

---

### Pitfall 9: Stripe Webhook Body Parsing — Raw Buffer Required

**What goes wrong:** Stripe webhook signature verification requires the raw, unparsed request body as a `Buffer`. Express/Hono middleware that parses JSON before the webhook handler reaches it (`express.json()` or Hono's `json()` middleware applied globally) transforms the body into an object. `stripe.webhooks.constructEvent()` then receives a stringified re-serialization, which does not match the original signature. All webhooks fail with signature errors.

**Why it happens:** Global body-parsing middleware is convenient and developers apply it to all routes.

**Consequences:** All Stripe webhook events fail verification silently or loudly. Subscription state never updates.

**Prevention:**
- Register `/webhooks/stripe/*` routes before any global JSON body parser middleware in Hono.
- Use Hono's raw body access (`c.req.raw` or a custom middleware that reads the raw body stream) for webhook routes.
- Verify this in the first webhook test — don't assume it works.

**Phase:** Auth & Billing phase.

---

### Pitfall 10: Better Auth Organization Plugin Is Not the Right Model Here

**What goes wrong:** Better Auth's Organization plugin is designed for B2B SaaS where users belong to organizations (landlords manage a team of managers). It handles org membership, invitations, and org-scoped sessions. This is relevant for the manager/viewer role requirement. The pitfall is using Better Auth Organization as the primary multi-tenancy mechanism and relying on `session.activeOrganizationId` as the tenant discriminator in RLS policies. Better Auth sessions use HTTP cookies; RLS SET LOCAL requires a Postgres session variable.

**Why it happens:** Organization plugin looks like the right tool; its session model is the natural place to get the current landlord. But the hop from "cookie session" to "Postgres SET LOCAL" requires an explicit bridge that is easy to omit.

**Consequences:** RLS policies can't read the landlord ID because no Postgres session variable is set. Developer patches by fetching `session.userId`, then passing it into every Drizzle query manually — which is application-layer enforcement, not DB-layer enforcement.

**Prevention:**
- In every Hono request handler (or middleware), after validating the Better Auth session, explicitly run `SET LOCAL app.current_landlord_id = '<id>'` before executing any Drizzle queries. Wrap this in a helper: `withLandlordContext(db, landlordId, async (tx) => { ... })`.
- Use the Better Auth Organization plugin for RBAC (landlord/manager/viewer roles), but treat it as orthogonal to the DB-level RLS tenant isolation.
- Test: a logged-in manager must not be able to read properties from a different landlord's organization even if they somehow obtain the other landlord's property ID.

**Phase:** Auth & Billing phase (design the context helper before any queries are written).

---

### Pitfall 11: Stripe Metered Billing — Usage Report Timing

**What goes wrong:** Villuh uses per-active-unit metered billing. Stripe metered billing requires the platform to report usage via `stripe.subscriptionItems.createUsageRecord()` before the billing period closes. If the Railway cron job that counts active units fires after Stripe's billing cutoff, the invoice for that period is incorrect. Stripe does not retroactively adjust closed invoices.

**Why it happens:** The billing cutoff is the subscription's `current_period_end`. Developers assume they can report usage any time during the period; in reality, Stripe closes the invoice shortly after `current_period_end` and ignores late reports.

**Consequences:** Landlord billed for wrong number of units. Refund or credit required. Revenue integrity broken.

**Prevention:**
- Report usage at least 1 hour before `current_period_end` to provide buffer.
- The Railway cron for usage reporting should run daily (not monthly) and report the current active unit count using the `set` action (not `increment`) to always reflect current truth.
- Store the last reported usage and timestamp in the DB for debugging.

**Phase:** Auth & Billing phase when metered billing is wired up.

---

### Pitfall 12: DocuSign Declined Signature — Envelope Cannot Be Reused

**What goes wrong:** When a signer declines, the DocuSign envelope enters a `declined` terminal state. The envelope cannot be resent or modified. The PROJECT.md requirement says "landlord can resend or revoke" after a decline. Developers attempt to re-trigger the declined envelope via the DocuSign API and get errors.

**Why it happens:** DocuSign's declined state is terminal. "Resend" in DocuSign terms means creating a new envelope with the same document.

**Consequences:** Resend functionality broken. Landlord can't recover declined documents.

**Prevention:**
- "Resend" must create a new DocuSign envelope with the same document. The old `envelope_id` on the document record is replaced with the new one.
- The document record's lifecycle state machine must handle: `declined → draft` (when landlord chooses to resend) as a state transition that triggers new envelope creation.
- Void functionality (PROJECT.md requirement) does work on non-declined envelopes via `PUT /envelopes/{envelopeId}` with `{ status: 'voided' }`.

**Phase:** Documents & DocuSign phase.

---

### Pitfall 13: CDC Audit Trail — Drizzle Has No Built-in CDC

**What goes wrong:** The PROJECT.md requires "full change data capture on all tables." Drizzle ORM has no built-in CDC or audit trigger system. Developers plan to add CDC "in a later phase" and find that retrofitting it onto all existing tables requires a large migration and rewriting query logic to include audit writes.

**Why it happens:** CDC is treated as a cross-cutting concern that can be added later. In reality, it needs to be part of the table creation pattern from the start.

**Consequences:** Audit trail missing for months of production data. Retrofit migration is high-risk.

**Prevention:**
- Define the audit record pattern in Phase 1: a generic `audit_log` table (`id`, `landlord_id`, `table_name`, `row_id`, `operation`, `old_values jsonb`, `new_values jsonb`, `actor_id`, `created_at`).
- Write a Hono middleware or Drizzle query wrapper that automatically appends audit inserts inside the same transaction as any UPDATE/DELETE.
- Alternatively, use Postgres triggers for CDC — more reliable than application-level writes because they fire even for direct SQL operations. Drizzle supports raw SQL in migrations for trigger creation.

**Phase:** Phase 1 (DB schema design). Must not be deferred.

---

## Minor Pitfalls

---

### Pitfall 14: `.vscode/github-accounts.json` Is Already Committed

**What goes wrong:** The PROJECT.md's codebase map notes this file is committed. GitHub OAuth tokens or account identifiers in committed files can expose credentials.

**Prevention:** Remove from tracking immediately: `git rm --cached .vscode/github-accounts.json` and add `.vscode/` to `.gitignore`. Rotate any tokens referenced in the file.

**Phase:** Pre-Phase 1 cleanup.

---

### Pitfall 15: Toaster Never Mounted — Silent Toast Failures

**What goes wrong:** The existing codebase has a `Toaster` component that is never mounted in the layout. Toast calls from all future feature code will silently no-op. Developers will write `toast.success(...)` calls expecting feedback, see nothing, and spend time debugging the wrong layer.

**Prevention:** Mount `<Toaster />` in `app/layout.tsx` before writing any feature code that relies on toasts.

**Phase:** Pre-Phase 1 cleanup.

---

### Pitfall 16: Dual Icon Libraries — Bundle Bloat

**What goes wrong:** Both `lucide-react` and `@central-icons-react/all` are installed. Using both inconsistently results in duplicated icon sets in the bundle and inconsistent icon styling across the UI.

**Prevention:** Pick one (recommend: `lucide-react` — better tree-shaking, larger ecosystem). Remove the other. Enforce in a lint rule or code review convention.

**Phase:** Pre-Phase 1 cleanup.

---

### Pitfall 17: UTC Storage Without Display Conversion for Lease Dates

**What goes wrong:** The PROJECT.md mandates "UTC storage, browser-local display." Lease `start_date`, `end_date`, and `due_day` are date-only fields (not datetime), but when stored as UTC timestamps and converted to local time at the browser, a 10pm UTC date becomes the previous calendar day in UTC-7. A landlord sets a lease to start "July 1" and it displays as "June 30" for tenants in Pacific time.

**Why it happens:** Using `timestamptz` for date-only fields (start/end of lease, due day of month) without accounting for timezone boundary crossing.

**Prevention:**
- Store purely date-based fields (lease start, end, due day) as Postgres `date` type, not `timestamptz`. Date type has no time component and no timezone conversion.
- Store event timestamps (created_at, updated_at, signed_at, payment_recorded_at) as `timestamptz` UTC. These are points in time; display conversion is correct.
- The `due_day` field is an integer (1-28); it does not need any date type at all.

**Phase:** Phase 1 (schema design) — wrong type chosen here is painful to migrate.

---

## Phase-Specific Warning Map

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| DB schema creation | RLS bypassed by owner role (P1) | Create `villuh_app` role before first migration |
| DB schema creation | Wrong date type for lease dates (P17) | Use `date` not `timestamptz` for start/end |
| DB schema creation | CDC not wired at table creation (P13) | Define audit_log pattern in Phase 1 |
| Auth & Billing setup | Two webhook endpoints needed (P3) | Architect separately from day 1 |
| Auth & Billing setup | Better Auth org vs. RLS bridge (P10) | Write `withLandlordContext()` helper |
| Auth & Billing setup | Raw body for Stripe webhook (P9) | Register webhook routes before JSON middleware |
| Auth & Billing setup | Metered billing usage report timing (P11) | Daily cron with `set` action |
| Onboarding Flow Engine | Flow snapshot vs. live definition (P7) | Store `snapshot_json` on instance row |
| Onboarding Flow Engine | Magic link consumed on first visit (P8) | Custom `onboarding_session` token, not BA magic link |
| Onboarding Flow Engine | Connect account not charges-enabled (P4) | Gate payment step creation and execution |
| Documents & DocuSign | Template vs. ad-hoc divergence (P6) | Strategy abstraction from day 1 |
| Documents & DocuSign | Declined envelope is terminal (P12) | "Resend" = new envelope creation |
| Documents & DocuSign | Webhook gap causes stuck status (P5) | Reconciliation endpoint in same sprint |
| Pre-Phase 1 | Committed credentials, missing Toaster, dual icons | Cleanup PR before any feature work |

---

## Sources

- Context7: `/better-auth/better-auth` — Organization plugin, magic link plugin, session hooks, Drizzle adapter configuration, additional user fields (HIGH confidence)
- Context7: `/drizzle-team/drizzle-orm` — RLS `.enableRLS()`, `pgPolicy`, views with `securityInvoker`, migration client separation pattern (HIGH confidence)
- Context7: `/stripe/stripe-node` — Connect account onboarding, webhook `constructEvent`, idempotency, per-request `stripeAccount` header (HIGH confidence)
- PROJECT.md — Villuh-specific constraints, known codebase concerns, architectural decisions (authoritative)
- Domain knowledge: DocuSign envelope lifecycle (declined terminal state, template vs ad-hoc API difference), Postgres RLS owner exemption, Stripe billing period cutoff behavior (MEDIUM confidence — verified against known DocuSign/Stripe API behavior patterns, WebFetch unavailable for confirmation)
