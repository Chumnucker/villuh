"use client"

import { useParams } from "next/navigation"
import { trpc } from "@villuh/api"
import {
  Page,
  SkeletonBox,
  SkeletonContainer,
  SkeletonField,
  SkeletonLabel,
  useBreadcrumbLabel,
} from "@villuh/ui"
import { PropertyForm } from "@/modules/properties/components/form/property-form"

export function EditPropertyTemplate() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const propertyQuery = trpc.properties.get.useQuery({ propertyId })

  useBreadcrumbLabel(propertyId, propertyQuery.data?.property.name)

  return (
    <Page.Shell centered>
      <Page.Boundary
        query={propertyQuery}
        pending={
          <SkeletonContainer className="flex-col gap-4">
            <Page.Header>
              <SkeletonLabel className="h-9 w-64" />
            </Page.Header>
            <Page.Content className="gap-6">
              <SkeletonField />
              <SkeletonField />
              <SkeletonField showLabel={false} />
              <SkeletonBox className="h-48 w-full rounded-2xl" />
            </Page.Content>
          </SkeletonContainer>
        }
        error={(error) => (
          <Page.Header>
            <Page.Title>Edit property</Page.Title>
            <Page.Description>
              {error.message || "This property could not be loaded."}
            </Page.Description>
          </Page.Header>
        )}
      >
        {({ property }) => (
          <>
            <Page.Header>
              <Page.Title>Edit property</Page.Title>
            </Page.Header>

            <Page.Content>
              <PropertyForm mode="edit" property={property} />
            </Page.Content>
          </>
        )}
      </Page.Boundary>
    </Page.Shell>
  )
}
