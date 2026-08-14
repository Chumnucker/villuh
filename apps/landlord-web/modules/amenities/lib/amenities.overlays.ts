import { createOverlays, entity, flag } from "@villuh/ui"
import { AmenitySheet } from "@/modules/amenities/components/amenity-sheet"
import { AddPropertyAmenitiesDialog } from "@/modules/amenities/components/add-property-amenities-dialog"

/**
 * Every amenities overlay, declared once. URL keys are `amenity.sheet` and
 * `amenity.add`.
 *
 * `sheet` is URL-backed via `entity(...)`: a pasted `?amenity.sheet={id}`
 * cold-loads the amenity detail sheet open, fetching the assignment by id
 * (D-40, SC-5). `add` is a payload-free flag for the property "Add amenities"
 * form dialog (`?amenity.add=open`), which reads its `propertyId` from the route.
 *
 * Both components receive their `overlay` handle as a prop and must NOT import
 * this registry back (acyclic).
 */
export const amenityOverlays = createOverlays("amenity", {
  /** URL-backed amenity detail sheet — `?amenity.sheet={propertyAmenityId}`. */
  sheet: entity(AmenitySheet),
  /** Property "Add amenities" form — open/closed only, `?amenity.add=open`. */
  add: flag(AddPropertyAmenitiesDialog),
})
