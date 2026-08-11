"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { trpc } from "@villuh/api"
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LinkButton,
  PlatformIcon,
  Skeleton,
  useLayout,
} from "@villuh/ui"
import { ROUTES } from "@/app/routes"
import { PropertyUnitsSection } from "@/modules/app/components/properties/property-units-section"

export default function PropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const { setBreadcrumbs } = useLayout()
  const { data, isLoading } = trpc.properties.get.useQuery({ propertyId })

  useEffect(() => {
    if (!data) return
    setBreadcrumbs((prev) => ({
      values: { ...prev.values, [propertyId]: data.property.name },
    }))
  }, [data, propertyId, setBreadcrumbs])

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-4xl" />
        <Skeleton className="h-48 rounded-4xl" />
      </div>
    )
  }

  const { property, units } = data
  const addressLines = [
    [property.street, property.line2].filter(Boolean).join(", "),
    [property.city, property.region, property.postal].filter(Boolean).join(", "),
    property.country,
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-medium tracking-tight">{property.name}</h1>
        <div className="flex items-center gap-2">
          <LinkButton href={ROUTES.propertyEdit(property.id)} variant="outline">
            Edit property
          </LinkButton>
          {/* Plan 08 wires the type-name-confirm dialog + cascading unit list onto this trigger. */}
          <Button variant="ghost-destructive" onClick={() => undefined}>
            Archive property
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {addressLines.length > 0 ? (
            <div className="flex items-start gap-2 text-sm text-foreground">
              <PlatformIcon icon="IconMapPin" size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
              <div className="flex flex-col">
                {addressLines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No address on file.</p>
          )}
          {property.phone ? (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <PlatformIcon icon="IconPhone" size={16} className="shrink-0 text-muted-foreground" />
              {property.phone}
            </div>
          ) : null}
          {property.notes ? (
            <div
              className="prose prose-sm max-w-none pt-2"
              dangerouslySetInnerHTML={{ __html: property.notes }}
            />
          ) : null}
        </CardContent>
      </Card>

      {/* Gallery shell — upload/reorder/cover UI wired in Plan 07 (D-34–D-38). */}
      <Card>
        <CardHeader>
          <CardTitle>Gallery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-1 py-12 text-center">
            <p className="text-sm font-medium text-foreground">No photos yet</p>
            <p className="text-sm text-muted-foreground">
              Upload photos to help your team recognize this property. First photo becomes the
              cover.
            </p>
          </div>
        </CardContent>
      </Card>

      <PropertyUnitsSection units={units} />
    </div>
  )
}
