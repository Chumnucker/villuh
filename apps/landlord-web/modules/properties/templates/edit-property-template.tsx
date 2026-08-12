"use client"

import { useParams } from "next/navigation"
import { trpc } from "@villuh/api"
import { Page, Skeleton } from "@villuh/ui"
import { PropertyForm } from "@/modules/properties/components/form/property-form"

export function EditPropertyTemplate() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const { data, isLoading } = trpc.properties.get.useQuery({ propertyId })

  if (isLoading || !data) {
    return (
      <Page.Shell>
        <Page.Header>
          <Skeleton className="h-9 w-64" />
        </Page.Header>
        <Page.Content>
          <Skeleton className="h-96 max-w-2xl rounded-2xl" />
        </Page.Content>
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
