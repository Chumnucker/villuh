-- Fix role_permissions.landlord_id type: uuid → text
-- Better Auth generates alphanumeric (non-UUID) org IDs; uuid column rejects them.
-- Drop the RLS policy first, then alter column, then recreate with text comparison.

DROP POLICY "tenant_isolation" ON "role_permissions";
--> statement-breakpoint
ALTER TABLE "role_permissions" ALTER COLUMN "landlord_id" TYPE text USING "landlord_id"::text;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "role_permissions" AS PERMISSIVE FOR ALL TO "villuh_app" USING (landlord_id = current_setting('app.current_landlord_id', true)) WITH CHECK (landlord_id = current_setting('app.current_landlord_id', true));
