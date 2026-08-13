import { createOverlays, entity, flag, pageEntity } from "@villuh/ui"
import { ArchivePropertyDialog } from "@/modules/properties/components/actions/archive-property-dialog"
import { ManageTagsDialog } from "@/modules/properties/components/tags/manage-tags-dialog"

/**
 * Properties overlays (D-07). Keys: `property.archive`, `property.tags`,
 * `property.photo`.
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
})
