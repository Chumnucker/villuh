"use client"

import { Page } from "@villuh/ui"
import { TenantsList } from "../components/list"

export function TenantsListTemplate() {
  return (
    <Page.Shell>
      <Page.Content>
        <TenantsList />
      </Page.Content>
    </Page.Shell>
  )
}
