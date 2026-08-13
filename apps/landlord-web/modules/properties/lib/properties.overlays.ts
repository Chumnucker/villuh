import { createOverlays, entity, flag, pageEntity } from "@villuh/ui"
import { ArchivePropertyDialog } from "@/modules/properties/components/actions/archive-property-dialog"
import { ManageTagsDialog } from "@/modules/properties/components/tags/manage-tags-dialog"
import { FloorPlanWizard } from "@/modules/properties/components/floor-plans/wizard/floor-plan-wizard"

/**
 * Properties overlays (D-07). Keys: `property.archive`, `property.tags`,
 * `property.photo`, `property.floorPlan`.
 *
 * `floorPlan` is an `entity` (D-01): its param value is the payload — `new` for
 * creation, a plan id for editing (D-02). The active wizard step is NEVER in the
 * URL. `<AppOverlays>` spreads `overlay.dialogProps` onto `FloorPlanWizard`,
 * which switches create vs edit off `overlay.value`.
 *
 * `photo` uses `pageEntity()` (D-31 second form / D-47): the key is registered
 * here — so it namespaces, participates in the collision assert, and works with
 * closeAll() and href() — but `<AppOverlays>` skips it and the gallery page
 * renders the Lightbox itself. The reason is specific and not generalizable:
 * the shared-element zoom sets `originRef.current` to the clicked thumbnail on
 * click, and a live DOM handle cannot reach a component mounted in the app
 * layout (D-32). This is the only page-mounted overlay in the codebase; a
 * second one is a signal to revisit D-08.
 */
export const propertyOverlays = createOverlays("property", {
  archive: entity(ArchivePropertyDialog),
  tags: flag(ManageTagsDialog),
  photo: pageEntity(),
  floorPlan: entity(FloorPlanWizard),
})
