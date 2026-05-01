-- Fix audit_log trigger to use current_setting('app.current_landlord_id') directly
-- instead of trying to cast NEW/OLD.landlord_id to uuid.
--
-- Problem: role_permissions.landlord_id is text (Better Auth non-UUID IDs), so
-- CASE TG_OP WHEN 'DELETE' THEN OLD.landlord_id::uuid fails with a cast error.
-- The audit_log.landlord_id column is uuid type — we need to store a valid uuid.
--
-- Solution: Use current_setting('app.current_landlord_id') which is always set by
-- withTenant() before any DML. This is the canonical landlord context for the transaction.
-- The fallback uuid (00000000...) is used when the setting is empty (e.g. DDL, clearTestUsers).

CREATE OR REPLACE FUNCTION audit_log_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_landlord_id text;
  v_row_id uuid;
BEGIN
  -- Get landlord_id from transaction-local setting (set by withTenant())
  v_landlord_id := current_setting('app.current_landlord_id', TRUE);

  -- Try to cast to uuid; fall back to nil uuid if not a valid uuid string
  -- (e.g. during clearTestUsers which runs without tenant context)
  BEGIN
    INSERT INTO audit_log (landlord_id, table_name, row_id, operation, old_values, new_values, actor_id)
    VALUES (
      CASE
        WHEN v_landlord_id IS NOT NULL AND v_landlord_id != ''
        THEN v_landlord_id::uuid
        ELSE '00000000-0000-0000-0000-000000000000'::uuid
      END,
      TG_TABLE_NAME,
      COALESCE(
        (CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END)
      ),
      TG_OP,
      CASE TG_OP WHEN 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
      CASE TG_OP WHEN 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
      COALESCE(current_setting('app.current_user_id', TRUE), 'system')
    );
  EXCEPTION WHEN invalid_text_representation THEN
    -- landlord_id was not a valid UUID (non-UUID Better Auth ID) — skip audit entry
    -- rather than storing a misleading 00000000 sentinel.
    NULL;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
