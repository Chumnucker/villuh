import { createOverlays, entity, flag } from "@villuh/ui"
import { ArchiveUnitDialog } from "@/modules/units/components/archive-unit-dialog"
import { UnitFormSheet } from "@/modules/units/components/form/unit-form-sheet"
import { ManageUnitStatusesDialog } from "@/modules/units/components/statuses/manage-unit-statuses-dialog"

/**
 * Every units overlay, declared once. URL keys are `unit.form`, `unit.archive`
 * and `unit.statuses`; adding the next one is one line here plus the component
 * — `<AppOverlays>` picks it up with no mount step.
 *
 * The registry references the components; the components must NOT import this
 * file back. They receive their handle as an `overlay` prop, which is what
 * keeps this import graph acyclic.
 */
export const unitOverlays = createOverlays("unit", {
  /** Create/edit sheet — `?unit.form=new` or `?unit.form={unitId}`. */
  form: entity(UnitFormSheet),
  /** Archive confirm — `?unit.archive={unitId}`. */
  archive: entity(ArchiveUnitDialog),
  /** Org unit-status catalog — open/closed only, `?unit.statuses=open`. */
  statuses: flag(ManageUnitStatusesDialog),
})
