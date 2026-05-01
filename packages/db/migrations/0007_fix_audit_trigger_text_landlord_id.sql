-- Fix audit_log_trigger_fn to handle text-format landlord_id values.
-- Better Auth generates alphanumeric (non-UUID) org IDs for Better Auth tables.
-- role_permissions.landlord_id was changed to text in migration 0006.
-- The trigger previously assumed landlord_id was always a valid UUID; this update
-- adds a safe cast with fallback to the nil UUID when the value is not UUID-format.

CREATE OR REPLACE FUNCTION public.audit_log_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_landlord_id_text text;
  v_landlord_id uuid;
BEGIN
  v_landlord_id_text := CASE TG_OP WHEN 'DELETE' THEN OLD.landlord_id::text ELSE NEW.landlord_id::text END;
  BEGIN
    v_landlord_id := v_landlord_id_text::uuid;
  EXCEPTION WHEN OTHERS THEN
    -- Non-UUID landlord_id (e.g. Better Auth alphanumeric org IDs) → use nil UUID sentinel
    v_landlord_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END;
  INSERT INTO audit_log (landlord_id, table_name, row_id, operation, old_values, new_values, actor_id)
  VALUES (
    COALESCE(v_landlord_id, '00000000-0000-0000-0000-000000000000'::uuid),
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
$function$;
