-- Promote the app-owned closed option sets from `text` to real Postgres enums.
-- Mirrors src/schema/enums.ts. Deliberately excludes anything Better Auth or the
-- Stripe plugin writes (member.role, invitation.status, subscription.status,
-- organization.subscription_tier/status), billing_plans.slug / plan_limits.tier
-- (rows, not a fixed set), and audit_log.operation (raw-SQL partitioned table
-- that already has a CHECK constraint).
--
-- villuh_app needs no extra grant: USAGE on a type is granted to PUBLIC by
-- default and nothing here revokes it.

CREATE TYPE "public"."property_type" AS ENUM (
  'single_family',
  'duplex',
  'triplex',
  'fourplex',
  'apartment_complex',
  'condo',
  'townhouse',
  'manufactured',
  'commercial',
  'other'
);--> statement-breakpoint

CREATE TYPE "public"."parking_type" AS ENUM (
  'none',
  'street',
  'driveway',
  'garage',
  'carport',
  'assigned_lot'
);--> statement-breakpoint

CREATE TYPE "public"."org_role" AS ENUM ('owner', 'manager', 'viewer');--> statement-breakpoint

CREATE TYPE "public"."action_category" AS ENUM ('write', 'financial', 'communications', 'admin');--> statement-breakpoint

CREATE TYPE "public"."plan_resource" AS ENUM ('units', 'properties', 'members');--> statement-breakpoint

CREATE TYPE "public"."tag_color" AS ENUM (
  'slate',
  'blue',
  'green',
  'amber',
  'orange',
  'red',
  'violet',
  'teal'
);--> statement-breakpoint

CREATE TYPE "public"."tag_icon" AS ENUM (
  'IconHouse',
  'IconDoor',
  'IconHomeDoor',
  'IconPeople',
  'IconStar',
  'IconFlag',
  'IconKey1',
  'IconMapPin',
  'IconLeaf',
  'IconFlame',
  'IconBolt',
  'IconHeart',
  'IconCircleCheck',
  'IconWrench'
);--> statement-breakpoint

-- Columns below were Zod-validated against these exact sets from the day they
-- shipped, so a plain cast is correct — if it fails, the row is genuinely bad
-- data we want to see rather than silently rewrite.
ALTER TABLE "properties"
  ALTER COLUMN "property_type" TYPE "public"."property_type"
  USING "property_type"::"public"."property_type";--> statement-breakpoint

ALTER TABLE "properties"
  ALTER COLUMN "parking_type" TYPE "public"."parking_type"
  USING "parking_type"::"public"."parking_type";--> statement-breakpoint

ALTER TABLE "role_permissions"
  ALTER COLUMN "role" TYPE "public"."org_role"
  USING "role"::"public"."org_role";--> statement-breakpoint

ALTER TABLE "role_permissions"
  ALTER COLUMN "action" TYPE "public"."action_category"
  USING "action"::"public"."action_category";--> statement-breakpoint

ALTER TABLE "plan_limits"
  ALTER COLUMN "resource" TYPE "public"."plan_resource"
  USING "resource"::"public"."plan_resource";--> statement-breakpoint

ALTER TABLE "organization_tag"
  ALTER COLUMN "icon_key" TYPE "public"."tag_icon"
  USING "icon_key"::"public"."tag_icon";--> statement-breakpoint

ALTER TABLE "organization_tag"
  ALTER COLUMN "color_key" TYPE "public"."tag_color"
  USING "color_key"::"public"."tag_color";--> statement-breakpoint

ALTER TABLE "property_tag"
  ALTER COLUMN "icon_key" TYPE "public"."tag_icon"
  USING "icon_key"::"public"."tag_icon";--> statement-breakpoint

ALTER TABLE "property_tag"
  ALTER COLUMN "color_key" TYPE "public"."tag_color"
  USING "color_key"::"public"."tag_color";--> statement-breakpoint

-- unit_statuses is the exception: its create/update input accepted any non-empty
-- string until this change (the UI only ever offered the palette, but the API
-- didn't enforce it). Fold anything off-palette onto a valid value so the cast
-- can't fail on data the old contract allowed.
UPDATE "unit_statuses"
  SET "icon_key" = 'IconCircleCheck'
  WHERE "icon_key" NOT IN (
    'IconHouse', 'IconDoor', 'IconHomeDoor', 'IconPeople', 'IconStar', 'IconFlag',
    'IconKey1', 'IconMapPin', 'IconLeaf', 'IconFlame', 'IconBolt', 'IconHeart',
    'IconCircleCheck', 'IconWrench'
  );--> statement-breakpoint

UPDATE "unit_statuses"
  SET "color_key" = 'slate'
  WHERE "color_key" NOT IN (
    'slate', 'blue', 'green', 'amber', 'orange', 'red', 'violet', 'teal'
  );--> statement-breakpoint

ALTER TABLE "unit_statuses"
  ALTER COLUMN "icon_key" TYPE "public"."tag_icon"
  USING "icon_key"::"public"."tag_icon";--> statement-breakpoint

ALTER TABLE "unit_statuses"
  ALTER COLUMN "color_key" TYPE "public"."tag_color"
  USING "color_key"::"public"."tag_color";
