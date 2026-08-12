"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { trpc } from "@villuh/api"
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LinkButton,
  Page,
  PlatformIcon,
  SkeletonBox,
  SkeletonContainer,
  SkeletonLabel,
  useLayout,
} from "@villuh/ui"
import { ROUTES } from "@/app/routes"
import { ArchivePropertyDialog } from "@/modules/properties/components/property/archive-property-dialog"
import { PropertyGallery } from "@/modules/properties/components/property/property-gallery"
import { PropertyUnitsSection } from "@/modules/properties/components/property/property-units-section"
import { TagPicker } from "@/modules/properties/components/tags/tag-picker"

export function PropertyTemplate() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const { setBreadcrumbs } = useLayout()
  const [archiveOpen, setArchiveOpen] = useState(false)
  const { data, isLoading } = trpc.properties.get.useQuery({ propertyId })

  useEffect(() => {
    if (!data) return
    setBreadcrumbs((prev) => ({
      values: { ...prev.values, [propertyId]: data.property.name },
    }))
  }, [data, propertyId, setBreadcrumbs])

  if (isLoading || !data) {
    return (
      <Page.Shell>
        <SkeletonContainer className="flex-col gap-4">
          <Page.Header>
            <SkeletonLabel className="h-9 w-64" />
          </Page.Header>
          <Page.Content>
            <SkeletonBox className="h-48 rounded-4xl" />
            <SkeletonBox className="h-48 rounded-4xl" />
          </Page.Content>
        </SkeletonContainer>
      </Page.Shell>
    )
  }

  const { property, units } = data
  const addressLines = [
    [property.street, property.line2].filter(Boolean).join(", "),
    [property.city, property.region, property.postal].filter(Boolean).join(", "),
    property.country,
  ].filter(Boolean)

  return (
    <Page.Shell>
      <Page.Header>
        <Page.Title>{property.name}</Page.Title>
        <Page.Actions>
          <LinkButton href={ROUTES.propertyEdit(property.id)} variant="outline">
            Edit property
          </LinkButton>
          <Button
            variant="ghost-destructive"
            onClick={() => setArchiveOpen(true)}
          >
            Archive property
          </Button>
        </Page.Actions>
      </Page.Header>

      <Page.Content className="gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {addressLines.length > 0 ? (
              <div className="flex items-start gap-2 text-sm text-foreground">
                <PlatformIcon
                  icon="IconMapPin"
                  size={16}
                  className="mt-0.5 shrink-0 text-muted-foreground"
                />
                <div className="flex flex-col">
                  {addressLines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No address on file.
              </p>
            )}
            {property.phone ? (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <PlatformIcon
                  icon="IconPhone"
                  size={16}
                  className="shrink-0 text-muted-foreground"
                />
                {property.phone}
              </div>
            ) : null}
            <TagPicker propertyId={property.id} />
            {property.notes ? (
              <div
                className="rich-text-content pt-2"
                dangerouslySetInnerHTML={{ __html: property.notes }}
              />
            ) : null}
          </CardContent>
        </Card>

        <PropertyGallery propertyId={property.id} />

        <PropertyUnitsSection propertyId={property.id} units={units} />
      </Page.Content>

      <ArchivePropertyDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        propertyId={property.id}
        propertyName={property.name}
      />
    </Page.Shell>
  )
}
