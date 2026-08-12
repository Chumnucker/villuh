"use client"

import { useParams } from "next/navigation"
import { trpc } from "@villuh/api"
import {
  Page,
  SkeletonBox,
  SkeletonContainer,
  SkeletonField,
  SkeletonLabel,
} from "@villuh/ui"
import { PropertyForm } from "@/modules/properties/components/form/property-form"

export function EditPropertyTemplate() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const { data, isLoading } = trpc.properties.get.useQuery({ propertyId })

  if (isLoading || !data) {
    return (
      <Page.Shell>
        <SkeletonContainer className="flex-col gap-4">
          <Page.Header>
            <SkeletonLabel className="h-9 w-64" />
          </Page.Header>
          <Page.Content className="max-w-2xl gap-6">
            <SkeletonField />
            <SkeletonField />
            <SkeletonField showLabel={false} />
            <SkeletonBox className="h-48 w-full rounded-2xl" />
          </Page.Content>
        </SkeletonContainer>
      </Page.Shell>
    )
  }

  return (
    <Page.Shell>
      <Page.Header>
        <Page.Title>Edit property</Page.Title>
      </Page.Header>

      <Page.Content>
        <PropertyForm mode="edit" property={data.property} />
      </Page.Content>
    </Page.Shell>
  )
}
