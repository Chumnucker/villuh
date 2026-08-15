import { createOverlays, entity, flag, pageEntity } from "@villuh/ui"
import { ArchivePropertyDialog } from "@/modules/properties/components/actions/archive-property-dialog"
import { ArchiveFloorPlanDialog } from "@/modules/properties/components/actions/archive-floor-plan-dialog"
import { FloorPlanOverlay } from "@/modules/properties/components/settings/units/floor-plans/wizard/floor-plan-overlay"
import { ManageTagsDialog } from "@/modules/properties/components/tags/manage-tags-dialog"

/**
 * Every properties overlay, declared once. URL keys are `property.archive`,
 * `property.tags`, `property.photo`, `property.floorPlan`, and
 * `property.floorPlanArchive`.
 *
 * `photo` uses `pageEntity()`: the key is registered here — so it namespaces,
 * participates in the collision guard, and works with `closeAll()`/`href()` —
 * but `<AppOverlays>` skips it and the gallery page renders the Lightbox
 * itself, because the shared-element zoom needs a live DOM ref to the clicked
 * thumbnail, which cannot reach a component mounted in the app layout. This
 * is the only page-mounted overlay in the codebase; a second one is a signal
 * to rethink the global mount.
 */
export const propertyOverlays = createOverlays("property", {
  /** Cascade soft-archive confirm — `?property.archive={propertyId}`. */
  archive: entity(ArchivePropertyDialog),
  /** Org tag catalog — open/closed only, `?property.tags=open`. */
  tags: flag(ManageTagsDialog),
  /** Gallery lightbox — `?property.photo={imageId}`, page-mounted (see above). */
  photo: pageEntity(),
  /** Create/edit wizards — `?property.floorPlan=new` or `={floorPlanId}`. */
  floorPlan: entity(FloorPlanOverlay),
  /** Soft-archive confirm — `?property.floorPlanArchive={floorPlanId}`. */
  floorPlanArchive: entity(ArchiveFloorPlanDialog),
})
