"use client"

import { Page } from "@villuh/ui"
import { UnitsList } from "@/modules/units/components/list"

export function UnitsListTemplate() {
  return (
    <Page.Shell>
      <Page.Content>
        <UnitsList />
      </Page.Content>
    </Page.Shell>
  )
}
