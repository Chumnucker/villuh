import { createOverlays, entity } from "@villuh/ui"
import { TenantFormSheet } from "@/modules/tenants/components/form/tenant-form-sheet"
import { ArchiveTenantDialog } from "@/modules/tenants/components/archive-tenant-dialog"
import { TenantDetailSheet } from "@/modules/tenants/components/tenant/tenant-detail-sheet"

/**
 * Every tenants overlay, declared once. URL keys are `tenant.form`,
 * `tenant.archive` and `tenant.detail` (each carries a tenant id payload);
 * adding the next one is one line here plus the component — `<AppOverlays>`
 * picks it up with no mount step.
 *
 * The registry references the components; the components must NOT import this
 * file back. They receive their handle as an `overlay` prop, which is what
 * keeps this import graph acyclic.
 */
export const tenantOverlays = createOverlays("tenant", {
  /** Create/edit sheet — `?tenant.form=new` or `?tenant.form={tenantId}`. */
  form: entity(TenantFormSheet),
  /** Archive confirm — `?tenant.archive={tenantId}`. */
  archive: entity(ArchiveTenantDialog),
  /** Read-only detail — `?tenant.detail={tenantId}`. */
  detail: entity(TenantDetailSheet),
})
