import { createOverlays, entity, flag } from "@villuh/ui"
import { ArchiveUnitDialog } from "@/modules/units/components/archive-unit-dialog"
import { UnitFormSheet } from "@/modules/units/components/form/unit-form-sheet"
import { ManageUnitStatusesDialog } from "@/modules/units/components/statuses/manage-unit-statuses-dialog"

/**
 * Every units overlay, declared once (D-07). URL keys are `unit.form`,
 * `unit.archive` and `unit.statuses` (D-13). Adding the next one is one line
 * here plus the component — `<AppOverlays>` picks it up with no mount step
 * (D-08).
 *
 * The registry references the components; the components must NOT import this
 * file back. They receive their handle as an `overlay` prop (D-09), which is
 * what keeps this import graph acyclic.
 *
 * `statuses` is a `flag` (no payload — open/closed only, `?unit.statuses=1`),
 * the org unit-status catalog. It mirrors properties' `ManageTagsDialog`
 * treatment in plan 03.1-07: the plan text for 03.1-06 only named the form +
 * archive trio but its acceptance criteria require the `UnitsList` `useState`
 * import to be gone, which is only true once this fourth dialog is URL-backed
 * too. Migrated here rather than left on local state.
 */
export const unitOverlays = createOverlays("unit", {
  form: entity(UnitFormSheet),
  archive: entity(ArchiveUnitDialog),
  statuses: flag(ManageUnitStatusesDialog),
})
