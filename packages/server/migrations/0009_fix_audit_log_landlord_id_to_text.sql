-- Fix audit_log.landlord_id to text type so it works with Better Auth non-UUID org IDs.
-- Better Auth generates IDs like "gOd2RxeLcJfxvwmjZceIxqeult0stA5x" (32-char text, not UUID v4).
-- The original uuid type causes cast failures in the audit trigger and RLS policy.
--
-- This migration:
-- 1. Converts audit_log.landlord_id from uuid to text
-- 2. Updates the RLS policy to use text comparison (no ::uuid cast)
-- 3. Updates the audit trigger to use current_setting directly without uuid cast

-- Step 1: Drop dependent objects
DROP POLICY IF EXISTS audit_log_tenant_isolation ON audit_log;

-- Step 2: Convert landlord_id column to text
ALTER TABLE audit_log ALTER COLUMN landlord_id TYPE text USING landlord_id::text;

-- Step 3: Recreate RLS policy with text comparison
CREATE POLICY audit_log_tenant_isolation ON audit_log
  AS PERMISSIVE FOR SELECT
  TO villuh_app
  USING (landlord_id = current_setting('app.current_landlord_id', TRUE));

-- Step 4: Update audit trigger to use current_setting directly (no uuid cast)
CREATE OR REPLACE FUNCTION audit_log_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (landlord_id, table_name, row_id, operation, old_values, new_values, actor_id)
  VALUES (
    -- Use current_setting directly (text = text, no cast needed)
    COALESCE(current_setting('app.current_landlord_id', TRUE), ''),
    TG_TABLE_NAME,
    COALESCE(
      (CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END)
    ),
    TG_OP,
    CASE TG_OP WHEN 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE TG_OP WHEN 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    COALESCE(current_setting('app.current_user_id', TRUE), 'system')
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
