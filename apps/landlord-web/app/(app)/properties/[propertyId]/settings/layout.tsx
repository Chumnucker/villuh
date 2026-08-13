"use client"

import { ViewTransition } from "react"
import { useParams, usePathname } from "next/navigation"
import { Page, SkeletonBox, SkeletonContainer, SkeletonLabel } from "@villuh/ui"
import { PropertySettingsHeader } from "@/modules/properties/components/settings/header"
import { PropertySettingsTabsNav } from "@/modules/properties/components/settings/navigation"
import { PropertyDetailProvider } from "@/modules/properties/providers/property-detail-provider"

export default function PropertySettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { propertyId } = useParams<{ propertyId: string }>()
  const pathname = usePathname()

  return (
    <Page.Shell centered>
      <PropertyDetailProvider
        propertyId={propertyId}
        pending={
          <SkeletonContainer className="flex-col gap-4">
            <Page.Header>
              <SkeletonLabel className="h-9 w-64" />
            </Page.Header>
            <SkeletonBox className="h-9 w-full max-w-md rounded-lg" />
            <SkeletonBox className="h-64 rounded-4xl" />
          </SkeletonContainer>
        }
      >
        <PropertySettingsHeader />
        <PropertySettingsTabsNav propertyId={propertyId} />

        {/* Scoped to just the tab content — header/nav above stay outside this
            boundary so switching tabs fades the content only, without the
            app-wide `PageTransition` (see `(app)/page-transition.tsx`)
            remounting/re-fading them. Same treatment as the `(detail)` layout. */}
        <ViewTransition
          key={pathname}
          enter="page-fade"
          exit="page-fade"
          default="none"
        >
          {children}
        </ViewTransition>
      </PropertyDetailProvider>
    </Page.Shell>
  )
}
