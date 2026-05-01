-- Idempotent seed script for plan_limits table
-- Safe to run multiple times; uses ON CONFLICT DO UPDATE
-- Apply to test/staging databases created before migration 0004

-- Seed plan_limits per D-18 (Phase 2 CONTEXT.md)
-- starter: 1-5 units, 1 property, 1 additional team member (1 owner + 1 = 2 total members)
-- growth: 6-20 units, 5 properties, 3 team members (1 owner + 3 = 4 total members)
-- pro: 21-50 units, unlimited properties (-1), unlimited team members (-1)
INSERT INTO plan_limits (tier, resource, "limit") VALUES
  ('starter', 'units', 5),
  ('starter', 'properties', 1),
  ('starter', 'members', 2),
  ('growth', 'units', 20),
  ('growth', 'properties', 5),
  ('growth', 'members', 4),
  ('pro', 'units', 50),
  ('pro', 'properties', -1),
  ('pro', 'members', -1)
ON CONFLICT (tier, resource) DO UPDATE SET "limit" = EXCLUDED."limit";
