CREATE TABLE "floor_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"property_id" uuid NOT NULL,
	"name" text NOT NULL,
	"bedrooms" integer NOT NULL,
	"bathrooms" numeric(4, 2) NOT NULL,
	"default_square_footage" integer,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "floor_plans_property_name_unique" UNIQUE("organization_id","property_id","name")
);
--> statement-breakpoint
ALTER TABLE "floor_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "floor_plan_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"floor_plan_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_length" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "floor_plan_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "floor_plan_id" uuid;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "bedrooms" integer;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "bathrooms" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_plan_images" ADD CONSTRAINT "floor_plan_images_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_plan_images" ADD CONSTRAINT "floor_plan_images_floor_plan_id_floor_plans_id_fk" FOREIGN KEY ("floor_plan_id") REFERENCES "public"."floor_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_floor_plan_id_floor_plans_id_fk" FOREIGN KEY ("floor_plan_id") REFERENCES "public"."floor_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "organization_isolation" ON "floor_plans" AS PERMISSIVE FOR ALL TO "villuh_app" USING (organization_id = current_setting('app.current_organization_id', true)) WITH CHECK (organization_id = current_setting('app.current_organization_id', true));--> statement-breakpoint
CREATE POLICY "organization_isolation" ON "floor_plan_images" AS PERMISSIVE FOR ALL TO "villuh_app" USING (organization_id = current_setting('app.current_organization_id', true)) WITH CHECK (organization_id = current_setting('app.current_organization_id', true));--> statement-breakpoint
-- Phase 3.2: attach audit triggers to the new floor-plan tables (Pitfall 6).
-- The shared trigger fn already exists (0001_audit_log.sql) and reads app.current_organization_id.
CREATE TRIGGER floor_plans_audit
  AFTER INSERT OR UPDATE OR DELETE ON floor_plans
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
--> statement-breakpoint
CREATE TRIGGER floor_plan_images_audit
  AFTER INSERT OR UPDATE OR DELETE ON floor_plan_images
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
