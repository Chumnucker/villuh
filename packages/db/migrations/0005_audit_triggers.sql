-- Phase 2: Attach audit_log triggers to Phase 2 tables
-- All tenant tables introduced in Phase 2 (role_permissions) need the audit trigger
-- so that changes made via Hono routes appear in the /api/audit-log endpoint (SETT-02).
--
-- The audit_log_trigger_fn() was created in 0001_audit_log.sql (SECURITY DEFINER).
-- RLS on audit_log (landlord_id = app.current_landlord_id) + the actor_id filter
-- in /api/audit-log together enforce personal log isolation (SETT-02 acceptance criteria).

CREATE TRIGGER role_permissions_audit
  AFTER INSERT OR UPDATE OR DELETE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
