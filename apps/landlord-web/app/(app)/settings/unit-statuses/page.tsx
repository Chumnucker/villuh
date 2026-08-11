"use client"

import { StatusCatalogPanel } from "@/modules/app/components/units/status-catalog-panel"
import { useUser } from "@/modules/app/providers/me-provider"

export default function UnitStatusesSettingsPage() {
  const { user } = useUser()
  const isAdmin = user.org.permissions.admin

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-medium tracking-tight">Unit statuses</h1>
        <p className="text-sm text-muted-foreground">
          Create, rename, reorder, and archive the availability statuses units can be assigned.
        </p>
      </div>
      {isAdmin ? (
        <StatusCatalogPanel />
      ) : (
        <p className="text-sm text-muted-foreground">
          Only owners and admins can manage the unit status catalog.
        </p>
      )}
    </div>
  )
}
