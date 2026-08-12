"use client"

import { trpc } from "@villuh/api"
import { LinkButton, Page, PlatformIcon, Skeleton } from "@villuh/ui"
import { ROUTES } from "@/app/routes"
import { PlanLimitGate } from "@/modules/app/components/plan-limit/plan-limit-gate"
import { PropertyCard } from "@/modules/properties/components/list/property-card"

export function PropertiesListTemplate() {
  const { data, isLoading } = trpc.properties.list.useQuery()

  return (
    <Page.Shell>
      <Page.Header>
        <Page.Title>Properties</Page.Title>
        <Page.Actions>
          <PlanLimitGate resource="properties">
            <LinkButton href={ROUTES.propertyNew}>
              <PlatformIcon
                icon="IconPlusSmall"
                size={16}
                data-icon="inline-start"
              />
              Add property
            </LinkButton>
          </PlanLimitGate>
        </Page.Actions>
      </Page.Header>

      <Page.Content>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-4xl" />
            ))}
          </div>
        ) : data && data.properties.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {data.properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 py-16 text-center">
            <p className="text-sm font-medium text-foreground">
              No properties yet
            </p>
            <p className="text-sm text-muted-foreground">
              Add your first property to start organizing units and leases.
            </p>
          </div>
        )}
      </Page.Content>
    </Page.Shell>
  )
}
