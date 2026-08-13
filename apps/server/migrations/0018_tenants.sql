CREATE TYPE "public"."tenancy_status" AS ENUM('pending', 'active', 'ended');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tenancies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"unit_id" uuid NOT NULL,
	"status" "tenancy_status" DEFAULT 'pending' NOT NULL,
	"start_date" date,
	"end_date" date,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenancies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tenancy_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"tenancy_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenancy_members_tenancy_tenant_unique" UNIQUE("tenancy_id","tenant_id")
);
--> statement-breakpoint
ALTER TABLE "tenancy_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenancy_members" ADD CONSTRAINT "tenancy_members_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenancy_members" ADD CONSTRAINT "tenancy_members_tenancy_id_tenancies_id_fk" FOREIGN KEY ("tenancy_id") REFERENCES "public"."tenancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenancy_members" ADD CONSTRAINT "tenancy_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "organization_isolation" ON "tenants" AS PERMISSIVE FOR ALL TO "villuh_app" USING (organization_id = current_setting('app.current_organization_id', true)) WITH CHECK (organization_id = current_setting('app.current_organization_id', true));--> statement-breakpoint
CREATE POLICY "organization_isolation" ON "tenancies" AS PERMISSIVE FOR ALL TO "villuh_app" USING (organization_id = current_setting('app.current_organization_id', true)) WITH CHECK (organization_id = current_setting('app.current_organization_id', true));--> statement-breakpoint
CREATE POLICY "organization_isolation" ON "tenancy_members" AS PERMISSIVE FOR ALL TO "villuh_app" USING (organization_id = current_setting('app.current_organization_id', true)) WITH CHECK (organization_id = current_setting('app.current_organization_id', true));--> statement-breakpoint
-- Tenant slice: attach audit triggers (shared fn reads app.current_organization_id).
CREATE TRIGGER tenants_audit
  AFTER INSERT OR UPDATE OR DELETE ON tenants
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
--> statement-breakpoint
CREATE TRIGGER tenancies_audit
  AFTER INSERT OR UPDATE OR DELETE ON tenancies
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
--> statement-breakpoint
CREATE TRIGGER tenancy_members_audit
  AFTER INSERT OR UPDATE OR DELETE ON tenancy_members
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
--> statement-breakpoint
-- At most one active, non-archived tenancy per unit (co-tenants share one tenancy).
CREATE UNIQUE INDEX tenancies_one_active_per_unit
  ON tenancies (unit_id)
  WHERE status = 'active' AND archived_at IS NULL;
