CREATE TABLE "test_tenant_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"landlord_id" uuid NOT NULL,
	"data" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "test_tenant_data" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "test_tenant_data" AS PERMISSIVE FOR ALL TO "villuh_app" USING (landlord_id = current_setting('app.current_landlord_id', true)::uuid) WITH CHECK (landlord_id = current_setting('app.current_landlord_id', true)::uuid);