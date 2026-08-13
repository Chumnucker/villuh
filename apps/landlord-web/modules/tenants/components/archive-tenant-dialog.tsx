"use client"

import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Button,
  Dialog,
  DialogContainer,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  OverlayBody,
  SkeletonLabel,
  type EntityOverlayHandle,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { ROUTES } from "@/app/routes"

/**
 * Tenant delete is a soft-archive, mirroring the unit archive dialog: a plain
 * destructive confirm (no type-the-name gate). The tenant is fetched by id,
 * gated on open; no parent passes a row in.
 */
export function ArchiveTenantDialog({
  overlay,
}: {
  overlay: EntityOverlayHandle
}) {
  const router = useRouter()
  const utils = trpc.useUtils()
  const tenantId = overlay.entityId
  const params = useParams<{ tenantId?: string }>()

  const tenantQuery = trpc.tenants.get.useQuery(
    { tenantId: tenantId ?? "" },
    { enabled: tenantId !== null }
  )

  const archiveTenant = trpc.tenants.archive.useMutation({
    onError: (err) => toast.error(err.message || "Could not archive tenant"),
  })

  // Read the redirect decision at click time — after invalidation, tenants.get
  // has refetched for a now-archived tenant, so reading it inside onSuccess is
  // unreliable (see the unit archive dialog for the same reasoning).
  const handleArchived = () =>
    invalidateQueries(utils, [(u) => u.tenants.list]).then(() => {
      toast.success("Tenant archived")
      overlay.close()
      if (params.tenantId && params.tenantId === tenantId) {
        router.push(ROUTES.tenants)
      }
    })

  return (
    <Dialog {...overlay.dialogProps}>
      <DialogContainer className="sm:max-w-sm">
        <OverlayBody
          query={tenantQuery}
          pending={<SkeletonLabel className="h-6 w-48" />}
        >
          {({ tenant }) => (
            <>
              <DialogHeader>
                <DialogTitle>
                  Archive {tenant.firstName} {tenant.lastName}?
                </DialogTitle>
              </DialogHeader>
              <DialogContent>
                <DialogDescription>
                  Archiving hides this tenant from active lists. Data is kept for
                  history.
                </DialogDescription>
              </DialogContent>
              <DialogFooter>
                <Button variant="outline" onClick={() => overlay.close()}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={archiveTenant.isPending}
                  onClick={() =>
                    archiveTenant.mutate(
                      { tenantId: tenant.id },
                      { onSuccess: () => handleArchived() }
                    )
                  }
                >
                  Archive tenant
                </Button>
              </DialogFooter>
            </>
          )}
        </OverlayBody>
      </DialogContainer>
    </Dialog>
  )
}
