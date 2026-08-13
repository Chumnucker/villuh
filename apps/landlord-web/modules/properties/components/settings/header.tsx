"use client"

import { LinkButton, Page, PlatformIcon, useBreadcrumbLabel } from "@villuh/ui"
import { ROUTES } from "@/app/routes"
import { usePropertyDetail } from "@/modules/properties/providers/property-detail-provider"

/**
 * Property settings header — keeps the property name as the page title (so the
 * settings pages read as the same entity as the detail pages) with a way back
 * to the property view. Reads from `usePropertyDetail()`, so it must render as
 * a child of `PropertyDetailProvider` (see `settings/layout.tsx`).
 *
 * Unlike `PropertyDetailHeader` there's no hero backdrop or tag editing here —
 * tags are edited in the General tab.
 */
export function PropertySettingsHeader() {
  const { property } = usePropertyDetail()

  useBreadcrumbLabel(property.id, property.name)

  return (
    <Page.Header>
      <div className="flex min-w-0 flex-col gap-2">
        <Page.Title>{property.name}</Page.Title>
        <Page.Description className="text-sm">
          Configure how this property behaves across Villuh.
        </Page.Description>
      </div>

      <Page.Actions>
        <LinkButton href={ROUTES.propertyDetail(property.id)} variant="outline">
          <PlatformIcon icon="IconArrowLeft" size={16} data-icon="inline-start" />
          Back to property
        </LinkButton>
      </Page.Actions>
    </Page.Header>
  )
}
