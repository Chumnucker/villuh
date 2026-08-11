"use client"

import { useParams } from "next/navigation"
import { trpc } from "@villuh/api"
import { Skeleton } from "@villuh/ui"
import { PropertyForm } from "@/modules/app/components/properties/property-form"

export default function EditPropertyPage() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const { data, isLoading } = trpc.properties.get.useQuery({ propertyId })

  if (isLoading || !data) {
    return (
      <div className="flex max-w-2xl flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-medium tracking-tight">Edit property</h1>
      </div>
      <PropertyForm mode="edit" property={data.property} />
    </div>
  )
}
