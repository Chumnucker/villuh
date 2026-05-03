-- Fix: role_permissions.landlord_id must be text (not uuid) because
-- Better Auth organization IDs are generated as text strings, not UUID v4 format.
-- Also fix the RLS policy to compare text without the ::uuid cast.

-- Must drop the policy first (Postgres won't alter a column used in a policy)
DROP POLICY IF EXISTS "tenant_isolation" ON role_permissions;

ALTER TABLE role_permissions ALTER COLUMN landlord_id TYPE text;

-- Recreate RLS policy without the ::uuid cast
CREATE POLICY "tenant_isolation" ON "role_permissions"
  AS PERMISSIVE FOR ALL TO "villuh_app"
  USING (landlord_id = current_setting('app.current_landlord_id', true))
  WITH CHECK (landlord_id = current_setting('app.current_landlord_id', true));
