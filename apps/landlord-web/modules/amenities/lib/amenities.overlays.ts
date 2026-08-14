import { createOverlays, entity, flag } from "@villuh/ui"
import { AmenitySheet } from "@/modules/amenities/components/amenity-sheet"
import { ManageAmenityCatalogDialog } from "@/modules/amenities/components/manage-catalog-dialog"

/**
 * Every amenities overlay, declared once. URL keys are `amenity.sheet` and
 * `amenity.catalog`.
 *
 * `sheet` is URL-backed via `entity(...)`: a pasted `?amenity.sheet={id}`
 * cold-loads the amenity detail sheet open, fetching the assignment by id
 * (D-40, SC-5). `catalog` is a payload-free flag for the org catalog dialog
 * (`?amenity.catalog=open`).
 *
 * Both components receive their `overlay` handle as a prop and must NOT import
 * this registry back (acyclic).
 */
export const amenityOverlays = createOverlays("amenity", {
  /** URL-backed amenity detail sheet — `?amenity.sheet={propertyAmenityId}`. */
  sheet: entity(AmenitySheet),
  /** Org amenity catalog — open/closed only, `?amenity.catalog=open`. */
  catalog: flag(ManageAmenityCatalogDialog),
})
