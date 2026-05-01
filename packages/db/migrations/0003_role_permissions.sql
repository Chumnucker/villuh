-- Phase 2: role_permissions table with RLS tenant isolation policy
-- Stores per-org × role × action permission configuration (D-10)

CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"landlord_id" uuid NOT NULL,
	"role" text NOT NULL,
	"action" text NOT NULL,
	"allowed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_unique" UNIQUE("landlord_id","role","action")
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "role_permissions" AS PERMISSIVE FOR ALL TO "villuh_app" USING (landlord_id = current_setting('app.current_landlord_id', true)::uuid) WITH CHECK (landlord_id = current_setting('app.current_landlord_id', true)::uuid);
