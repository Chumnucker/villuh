-- OPERATIONAL GAP (from 0001_audit_log.sql): pre-create the next batch of monthly
-- audit_log partitions. A cron job to automate this is deferred to Phase 6; without
-- this, any INSERT/UPDATE/DELETE on an audited table fails with
-- "no partition of relation audit_log found for row" once the current month rolls
-- past the last pre-created partition (blocked properties/units writes as of 2026-08).
CREATE TABLE audit_log_y2026m08 PARTITION OF audit_log
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE audit_log_y2026m09 PARTITION OF audit_log
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE audit_log_y2026m10 PARTITION OF audit_log
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE audit_log_y2026m11 PARTITION OF audit_log
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE audit_log_y2026m12 PARTITION OF audit_log
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
