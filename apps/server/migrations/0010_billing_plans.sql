-- System table: paid billing plans (slug + Stripe price + trial). No RLS.
-- plan_limits.tier references billing_plans.slug.

CREATE TABLE "billing_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"stripe_price_id" text NOT NULL,
	"trial_days" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "billing_plans_slug_unique" UNIQUE("slug")
);

-- Seed paid plans. stripe_price_id filled by migrate hydrate from env when empty.
INSERT INTO billing_plans (slug, name, stripe_price_id, trial_days, sort_order, is_active) VALUES
  ('starter', 'Starter', '', NULL, 1, true),
  ('growth', 'Growth', '', NULL, 2, true),
  ('pro', 'Pro', '', 30, 3, true)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE "plan_limits"
  ADD CONSTRAINT "plan_limits_tier_fkey"
  FOREIGN KEY ("tier") REFERENCES "billing_plans"("slug");

GRANT SELECT ON "billing_plans" TO villuh_app;
