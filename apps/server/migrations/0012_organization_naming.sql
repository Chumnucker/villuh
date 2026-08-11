-- Rename RLS demo table + policy names from tenant_* → organization_*

ALTER TABLE test_tenant_data RENAME TO test_organization_data;

ALTER TRIGGER test_tenant_data_audit ON test_organization_data
  RENAME TO test_organization_data_audit;

DROP POLICY IF EXISTS tenant_isolation ON test_organization_data;
CREATE POLICY organization_isolation ON test_organization_data
  AS PERMISSIVE FOR ALL
  TO villuh_app
  USING (organization_id = current_setting('app.current_organization_id', true))
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true));

DROP POLICY IF EXISTS tenant_isolation ON role_permissions;
CREATE POLICY organization_isolation ON role_permissions
  AS PERMISSIVE FOR ALL
  TO villuh_app
  USING (organization_id = current_setting('app.current_organization_id', true))
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true));

DROP POLICY IF EXISTS audit_log_tenant_isolation ON audit_log;
CREATE POLICY audit_log_organization_isolation ON audit_log
  AS PERMISSIVE FOR SELECT
  TO villuh_app
  USING (organization_id = current_setting('app.current_organization_id', TRUE));
