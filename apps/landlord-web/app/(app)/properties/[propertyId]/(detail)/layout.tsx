"use client"

import { ViewTransition } from "react"
import { useParams, usePathname } from "next/navigation"
import { Page, SkeletonBox, SkeletonContainer, SkeletonLabel } from "@villuh/ui"
import { PropertyDetailHeader } from "@/modules/properties/components/view/header"
import { PropertyTabsNav } from "@/modules/properties/components/view/navigation"
import { PropertyDetailProvider } from "@/modules/properties/providers/property-detail-provider"

export default function PropertyDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { propertyId } = useParams<{ propertyId: string }>()
  const pathname = usePathname()

  return (
    <Page.Shell centered className="isolate">
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
        <PropertyDetailHeader />
        <PropertyTabsNav propertyId={propertyId} />

        {/* Scoped to just the tab content — header/nav above stay outside
            this boundary so switching tabs fades the content only, without
            the app-wide `PageTransition` (see `(app)/page-transition.tsx`)
            remounting/re-fading them. */}
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
