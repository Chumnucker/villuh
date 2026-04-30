-- Phase 1: Audit Log Infrastructure
-- Generated migration with raw SQL for triggers and partitioning
-- (These cannot be expressed in Drizzle's TypeScript schema DSL)

-- 1. Create audit_log table with monthly range partitioning
CREATE TABLE audit_log (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL,
  table_name  text NOT NULL,
  row_id      uuid NOT NULL,
  operation   text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values  jsonb,
  new_values  jsonb,
  actor_id    text NOT NULL DEFAULT 'system',
  created_at  timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- 2. Pre-create monthly partitions (2026-04 through 2026-07)
-- OPERATIONAL GAP: A cron job to pre-create future partitions is deferred to Phase 6.
-- Manually add partition DDL here if running after 2026-07.
CREATE TABLE audit_log_y2026m04 PARTITION OF audit_log
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE audit_log_y2026m05 PARTITION OF audit_log
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE audit_log_y2026m06 PARTITION OF audit_log
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE audit_log_y2026m07 PARTITION OF audit_log
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- 3. Enable RLS on audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_tenant_isolation ON audit_log
  AS PERMISSIVE FOR SELECT
  TO villuh_app
  USING (landlord_id = current_setting('app.current_landlord_id', TRUE)::uuid);

-- 4. Audit trigger function (SECURITY DEFINER so it can write to audit_log regardless of caller)
CREATE OR REPLACE FUNCTION audit_log_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (landlord_id, table_name, row_id, operation, old_values, new_values, actor_id)
  VALUES (
    COALESCE(
      (CASE TG_OP WHEN 'DELETE' THEN OLD.landlord_id ELSE NEW.landlord_id END),
      '00000000-0000-0000-0000-000000000000'::uuid
    ),
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

-- 5. Immutability trigger: prevent any modification of audit_log rows
CREATE OR REPLACE FUNCTION audit_log_immutable_fn()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log rows are immutable — modification is forbidden';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable_fn();

-- 6. Attach audit trigger to test_tenant_data (Phase 1 demo — all future tenant tables get this)
CREATE TRIGGER test_tenant_data_audit
  AFTER INSERT OR UPDATE OR DELETE ON test_tenant_data
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
