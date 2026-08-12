"use client"

import { Page } from "@villuh/ui"
import { useUser } from "@/modules/app/providers/me-provider"
import { StatusCatalogPanel } from "@/modules/units/components/statuses/status-catalog-panel"

export function UnitStatusesTemplate() {
  const { user } = useUser()
  const isAdmin = user.org.permissions.admin

  return (
    <Page.Shell>
      <Page.Header>
        <Page.Title>Unit statuses</Page.Title>
        <Page.Description>
          Create, rename, reorder, and archive the availability statuses units
          can be assigned.
        </Page.Description>
      </Page.Header>

      <Page.Content>
        {isAdmin ? (
          <StatusCatalogPanel />
        ) : (
          <p className="text-sm text-muted-foreground">
            Only owners and admins can manage the unit status catalog.
          </p>
        )}
      </Page.Content>
    </Page.Shell>
  )
}
