CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"notes" text,
	"street" text,
	"line2" text,
	"city" text,
	"region" text,
	"postal" text,
	"country" text,
	"latitude" numeric(9, 7),
	"longitude" numeric(10, 7),
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "properties" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "property_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"property_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_length" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "property_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "unit_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"icon_key" text NOT NULL,
	"color_key" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unit_statuses_org_name_unique" UNIQUE("organization_id","name")
);
--> statement-breakpoint
ALTER TABLE "unit_statuses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"property_id" uuid NOT NULL,
	"label" text NOT NULL,
	"square_footage" integer,
	"base_rent" integer DEFAULT 0 NOT NULL,
	"status_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "units" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "organization_tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"icon_key" text NOT NULL,
	"color_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_tag_org_name_unique" UNIQUE("organization_id","name")
);
--> statement-breakpoint
ALTER TABLE "organization_tag" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "property_tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"property_id" uuid NOT NULL,
	"organization_tag_id" uuid,
	"label" text NOT NULL,
	"icon_key" text NOT NULL,
	"color_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "property_tag" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_statuses" ADD CONSTRAINT "unit_statuses_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_status_id_unit_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."unit_statuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_tag" ADD CONSTRAINT "organization_tag_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_tag" ADD CONSTRAINT "property_tag_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_tag" ADD CONSTRAINT "property_tag_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_tag" ADD CONSTRAINT "property_tag_organization_tag_id_organization_tag_id_fk" FOREIGN KEY ("organization_tag_id") REFERENCES "public"."organization_tag"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "organization_isolation" ON "properties" AS PERMISSIVE FOR ALL TO "villuh_app" USING (organization_id = current_setting('app.current_organization_id', true)) WITH CHECK (organization_id = current_setting('app.current_organization_id', true));--> statement-breakpoint
CREATE POLICY "organization_isolation" ON "property_images" AS PERMISSIVE FOR ALL TO "villuh_app" USING (organization_id = current_setting('app.current_organization_id', true)) WITH CHECK (organization_id = current_setting('app.current_organization_id', true));--> statement-breakpoint
CREATE POLICY "organization_isolation" ON "unit_statuses" AS PERMISSIVE FOR ALL TO "villuh_app" USING (organization_id = current_setting('app.current_organization_id', true)) WITH CHECK (organization_id = current_setting('app.current_organization_id', true));--> statement-breakpoint
CREATE POLICY "organization_isolation" ON "units" AS PERMISSIVE FOR ALL TO "villuh_app" USING (organization_id = current_setting('app.current_organization_id', true)) WITH CHECK (organization_id = current_setting('app.current_organization_id', true));--> statement-breakpoint
CREATE POLICY "organization_isolation" ON "organization_tag" AS PERMISSIVE FOR ALL TO "villuh_app" USING (organization_id = current_setting('app.current_organization_id', true)) WITH CHECK (organization_id = current_setting('app.current_organization_id', true));--> statement-breakpoint
CREATE POLICY "organization_isolation" ON "property_tag" AS PERMISSIVE FOR ALL TO "villuh_app" USING (organization_id = current_setting('app.current_organization_id', true)) WITH CHECK (organization_id = current_setting('app.current_organization_id', true));--> statement-breakpoint
-- Phase 3: attach audit_log triggers to the new portfolio tables (Pitfall 6).
-- audit_log_trigger_fn() already exists (0001_audit_log.sql) and reads app.current_organization_id.
CREATE TRIGGER properties_audit
  AFTER INSERT OR UPDATE OR DELETE ON properties
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
--> statement-breakpoint
CREATE TRIGGER property_images_audit
  AFTER INSERT OR UPDATE OR DELETE ON property_images
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
--> statement-breakpoint
CREATE TRIGGER units_audit
  AFTER INSERT OR UPDATE OR DELETE ON units
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
--> statement-breakpoint
CREATE TRIGGER unit_statuses_audit
  AFTER INSERT OR UPDATE OR DELETE ON unit_statuses
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
--> statement-breakpoint
CREATE TRIGGER organization_tag_audit
  AFTER INSERT OR UPDATE OR DELETE ON organization_tag
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
--> statement-breakpoint
CREATE TRIGGER property_tag_audit
  AFTER INSERT OR UPDATE OR DELETE ON property_tag
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();