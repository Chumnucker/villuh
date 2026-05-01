-- Fix audit_log RLS policy to work with Better Auth text IDs (non-UUID format).
-- Better Auth generates IDs like "gOd2RxeLcJfxvwmjZceIxqeult0stA5x" (text, not UUID format).
-- The original policy used ::uuid cast which fails for non-UUID strings.
-- Compare landlord_id::text instead so the policy works with any ID format.

DROP POLICY IF EXISTS audit_log_tenant_isolation ON audit_log;
CREATE POLICY audit_log_tenant_isolation ON audit_log
  AS PERMISSIVE FOR SELECT
  TO villuh_app
  USING (landlord_id::text = current_setting('app.current_landlord_id', TRUE));
