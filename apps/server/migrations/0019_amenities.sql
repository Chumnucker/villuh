CREATE TYPE "public"."amenity_scope" AS ENUM('property', 'unit', 'both');--> statement-breakpoint
CREATE TYPE "public"."amenity_icon" AS ENUM('IconStar', 'IconPool', 'IconGym', 'IconLaundry', 'IconWifi', 'IconPets', 'IconParking', 'IconEvCharging', 'IconAirConditioning', 'IconHeating', 'IconFridge', 'IconKitchen', 'IconBath', 'IconBed', 'IconFurnished', 'IconTv', 'IconTheater', 'IconSecurity', 'IconCamera', 'IconOutlet', 'IconLighting', 'IconLounge', 'IconGameRoom', 'IconBasketball', 'IconTennis', 'IconGolf', 'IconVolleyball', 'IconWater', 'IconPackageLocker', 'IconMail', 'IconCoworking', 'IconCoffee', 'IconOutdoor', 'IconPatio', 'IconRooftop', 'IconAccessible', 'IconTrack', 'IconLibrary');--> statement-breakpoint
CREATE TABLE "organization_amenity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"scope" "amenity_scope" NOT NULL,
	"icon_key" "amenity_icon" DEFAULT 'IconStar' NOT NULL,
	"color_key" "tag_color" DEFAULT 'slate' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_amenity_org_name_unique" UNIQUE("organization_id","name")
);
--> statement-breakpoint
ALTER TABLE "organization_amenity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "property_amenity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"property_id" uuid NOT NULL,
	"organization_amenity_id" uuid,
	"label" text NOT NULL,
	"description" text,
	"icon_key" "amenity_icon" DEFAULT 'IconStar' NOT NULL,
	"color_key" "tag_color" DEFAULT 'slate' NOT NULL,
	"is_reservable" boolean DEFAULT false NOT NULL,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "property_amenity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "unit_amenity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"unit_id" uuid NOT NULL,
	"organization_amenity_id" uuid,
	"label" text NOT NULL,
	"icon_key" "amenity_icon" DEFAULT 'IconStar' NOT NULL,
	"color_key" "tag_color" DEFAULT 'slate' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unit_amenity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "property_amenity_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"property_amenity_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_length" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "property_amenity_image" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization_amenity" ADD CONSTRAINT "organization_amenity_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_amenity" ADD CONSTRAINT "property_amenity_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_amenity" ADD CONSTRAINT "property_amenity_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_amenity" ADD CONSTRAINT "property_amenity_organization_amenity_id_organization_amenity_id_fk" FOREIGN KEY ("organization_amenity_id") REFERENCES "public"."organization_amenity"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_amenity" ADD CONSTRAINT "unit_amenity_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_amenity" ADD CONSTRAINT "unit_amenity_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_amenity" ADD CONSTRAINT "unit_amenity_organization_amenity_id_organization_amenity_id_fk" FOREIGN KEY ("organization_amenity_id") REFERENCES "public"."organization_amenity"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_amenity_image" ADD CONSTRAINT "property_amenity_image_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_amenity_image" ADD CONSTRAINT "property_amenity_image_property_amenity_id_property_amenity_id_fk" FOREIGN KEY ("property_amenity_id") REFERENCES "public"."property_amenity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "organization_isolation" ON "organization_amenity" AS PERMISSIVE FOR ALL TO "villuh_app" USING (organization_id = current_setting('app.current_organization_id', true)) WITH CHECK (organization_id = current_setting('app.current_organization_id', true));--> statement-breakpoint
CREATE POLICY "organization_isolation" ON "property_amenity" AS PERMISSIVE FOR ALL TO "villuh_app" USING (organization_id = current_setting('app.current_organization_id', true)) WITH CHECK (organization_id = current_setting('app.current_organization_id', true));--> statement-breakpoint
CREATE POLICY "organization_isolation" ON "unit_amenity" AS PERMISSIVE FOR ALL TO "villuh_app" USING (organization_id = current_setting('app.current_organization_id', true)) WITH CHECK (organization_id = current_setting('app.current_organization_id', true));--> statement-breakpoint
CREATE POLICY "organization_isolation" ON "property_amenity_image" AS PERMISSIVE FOR ALL TO "villuh_app" USING (organization_id = current_setting('app.current_organization_id', true)) WITH CHECK (organization_id = current_setting('app.current_organization_id', true));--> statement-breakpoint
-- Partial unique index: one catalog-backed assignment per property (D-22). Freeform rows (NULL) exempt.
CREATE UNIQUE INDEX "property_amenity_catalog_unique" ON "property_amenity" ("property_id","organization_amenity_id") WHERE organization_amenity_id IS NOT NULL;--> statement-breakpoint
-- Partial unique index: one catalog-backed assignment per unit (D-24). Freeform rows (NULL) exempt.
CREATE UNIQUE INDEX "unit_amenity_catalog_unique" ON "unit_amenity" ("unit_id","organization_amenity_id") WHERE organization_amenity_id IS NOT NULL;--> statement-breakpoint
-- Amenities: attach audit triggers (shared fn reads app.current_organization_id) (D-27).
CREATE TRIGGER organization_amenity_audit
  AFTER INSERT OR UPDATE OR DELETE ON organization_amenity
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
--> statement-breakpoint
CREATE TRIGGER property_amenity_audit
  AFTER INSERT OR UPDATE OR DELETE ON property_amenity
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
--> statement-breakpoint
CREATE TRIGGER unit_amenity_audit
  AFTER INSERT OR UPDATE OR DELETE ON unit_amenity
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
--> statement-breakpoint
CREATE TRIGGER property_amenity_image_audit
  AFTER INSERT OR UPDATE OR DELETE ON property_amenity_image
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
