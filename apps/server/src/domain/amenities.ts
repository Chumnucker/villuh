import { and, eq } from 'drizzle-orm'
import { organizationAmenity } from '../schema/amenities.js'
import type { AmenityIconKey, AmenityScope } from '../modules/amenities/schemas.js'
import type { TagColorKey } from '../modules/tags/schemas.js'
import type { OrganizationTx } from '../db/index.js'

type DefaultAmenity = {
  name: string
  scope: AmenityScope
  iconKey: AmenityIconKey
  colorKey: TagColorKey
  sortOrder: number
}

// Seeded starter catalog (D-43) — 22 entries, grouped property / both / unit. Each carries a
// verified AMENITY_ICON_KEYS glyph + a tag_color; sortOrder orders pickers deterministically.
export const DEFAULT_AMENITIES: readonly DefaultAmenity[] = [
  // Property scope
  { name: 'Pool', scope: 'property', iconKey: 'IconPool', colorKey: 'blue', sortOrder: 0 },
  { name: 'Fitness center', scope: 'property', iconKey: 'IconGym', colorKey: 'red', sortOrder: 1 },
  { name: 'Clubhouse', scope: 'property', iconKey: 'IconLounge', colorKey: 'violet', sortOrder: 2 },
  { name: 'Package lockers', scope: 'property', iconKey: 'IconPackageLocker', colorKey: 'amber', sortOrder: 3 },
  { name: 'Secure entry', scope: 'property', iconKey: 'IconSecurity', colorKey: 'slate', sortOrder: 4 },
  { name: 'Elevator', scope: 'property', iconKey: 'IconAccessible', colorKey: 'slate', sortOrder: 5 },
  { name: 'Playground', scope: 'property', iconKey: 'IconOutdoor', colorKey: 'green', sortOrder: 6 },
  { name: 'Grill area', scope: 'property', iconKey: 'IconPatio', colorKey: 'orange', sortOrder: 7 },
  { name: 'On-site laundry', scope: 'property', iconKey: 'IconLaundry', colorKey: 'teal', sortOrder: 8 },
  { name: 'EV charging', scope: 'property', iconKey: 'IconEvCharging', colorKey: 'green', sortOrder: 9 },
  // Both scopes
  { name: 'Covered parking', scope: 'both', iconKey: 'IconParking', colorKey: 'slate', sortOrder: 10 },
  { name: 'Pet friendly', scope: 'both', iconKey: 'IconPets', colorKey: 'amber', sortOrder: 11 },
  { name: 'Central air', scope: 'both', iconKey: 'IconAirConditioning', colorKey: 'blue', sortOrder: 12 },
  { name: 'High-speed internet', scope: 'both', iconKey: 'IconWifi', colorKey: 'violet', sortOrder: 13 },
  // Unit scope
  { name: 'In-unit laundry', scope: 'unit', iconKey: 'IconLaundry', colorKey: 'teal', sortOrder: 14 },
  { name: 'Dishwasher', scope: 'unit', iconKey: 'IconKitchen', colorKey: 'blue', sortOrder: 15 },
  { name: 'Stainless steel appliances', scope: 'unit', iconKey: 'IconFridge', colorKey: 'slate', sortOrder: 16 },
  { name: 'Hardwood floors', scope: 'unit', iconKey: 'IconStar', colorKey: 'orange', sortOrder: 17 },
  { name: 'Balcony / patio', scope: 'unit', iconKey: 'IconPatio', colorKey: 'green', sortOrder: 18 },
  { name: 'Walk-in closet', scope: 'unit', iconKey: 'IconFurnished', colorKey: 'violet', sortOrder: 19 },
  { name: 'Furnished', scope: 'unit', iconKey: 'IconBed', colorKey: 'amber', sortOrder: 20 },
  { name: 'Ceiling fans', scope: 'unit', iconKey: 'IconLighting', colorKey: 'teal', sortOrder: 21 },
] as const

/**
 * Seed the 22 starter catalog amenities for an organization on first read (D-43).
 *
 * D-44 guard: skip if the org already has ANY is_system row — archived ones count. Guarding on
 * "zero rows" (or relying on ON CONFLICT alone) would resurrect starters the moment a landlord
 * renamed-then-archived one, silently regrowing a catalog they deliberately pruned.
 */
export async function ensureDefaultAmenities(organizationId: string, tx: OrganizationTx): Promise<void> {
  const [seeded] = await tx
    .select({ id: organizationAmenity.id })
    .from(organizationAmenity)
    .where(and(eq(organizationAmenity.organizationId, organizationId), eq(organizationAmenity.isSystem, true)))
    .limit(1)
  if (seeded) return

  await tx.insert(organizationAmenity).values(
    DEFAULT_AMENITIES.map((amenity) => ({
      organizationId,
      name: amenity.name,
      scope: amenity.scope,
      iconKey: amenity.iconKey,
      colorKey: amenity.colorKey,
      sortOrder: amenity.sortOrder,
      isSystem: true,
    })),
  )
}
