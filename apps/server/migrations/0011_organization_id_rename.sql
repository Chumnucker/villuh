-- Align tenant column naming with Better Auth: landlord_id → organization_id
-- RLS setting: app.current_landlord_id → app.current_organization_id
-- Add FK role_permissions.organization_id → organization.id

-- ── role_permissions ──────────────────────────────────────────────────────────
ALTER TABLE role_permissions RENAME COLUMN landlord_id TO organization_id;

ALTER TABLE role_permissions RENAME CONSTRAINT role_permissions_unique TO role_permissions_org_role_action_unique;

DROP POLICY IF EXISTS tenant_isolation ON role_permissions;
CREATE POLICY tenant_isolation ON role_permissions
  AS PERMISSIVE FOR ALL
  TO villuh_app
  USING (organization_id = current_setting('app.current_organization_id', true))
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true));

ALTER TABLE role_permissions
  ADD CONSTRAINT role_permissions_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE CASCADE;

-- ── audit_log ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS audit_log_tenant_isolation ON audit_log;

ALTER TABLE audit_log RENAME COLUMN landlord_id TO organization_id;

CREATE POLICY audit_log_tenant_isolation ON audit_log
  AS PERMISSIVE FOR SELECT
  TO villuh_app
  USING (organization_id = current_setting('app.current_organization_id', TRUE));

CREATE OR REPLACE FUNCTION audit_log_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_organization_id text;
BEGIN
  v_organization_id := current_setting('app.current_organization_id', TRUE);
  IF v_organization_id IS NULL OR v_organization_id = '' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO audit_log (organization_id, table_name, row_id, operation, old_values, new_values, actor_id)
  VALUES (
    v_organization_id,
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

-- FK: drop orphan / empty org refs before adding constraint
DELETE FROM audit_log
WHERE organization_id IS NULL
   OR organization_id = ''
   OR organization_id NOT IN (SELECT id FROM organization);

ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE CASCADE;

-- ── test_tenant_data (RLS demo) ───────────────────────────────────────────────
DROP POLICY IF EXISTS tenant_isolation ON test_tenant_data;

ALTER TABLE test_tenant_data
  ALTER COLUMN landlord_id TYPE text USING landlord_id::text;

ALTER TABLE test_tenant_data RENAME COLUMN landlord_id TO organization_id;

CREATE POLICY tenant_isolation ON test_tenant_data
  AS PERMISSIVE FOR ALL
  TO villuh_app
  USING (organization_id = current_setting('app.current_organization_id', true))
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true));
