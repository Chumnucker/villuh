"use client"

import { trpc } from "@villuh/api"
import { ButtonVariants, LinkButton, Page, PlatformIcon, SkeletonContainer, cn } from "@villuh/ui"
import { ROUTES } from "@/app/routes"
import { PlanLimitGate } from "@/modules/app/components/plan-limit/plan-limit-gate"
import {
  PROPERTY_CARD_GRID_CLASS,
  PROPERTY_CARD_SKELETON_COUNT,
  PropertyCard,
  PropertyCardSkeleton,
} from "@/modules/properties/components/list/property-card"

function PropertyCardGrid({
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={PROPERTY_CARD_GRID_CLASS} {...props}>
      {children}
    </div>
  )
}

/** Shared track across cards; each card clips its own shimmer so gaps stay clean. */
function PropertySkeletonGrid({ className }: { className?: string }) {
  return (
    <SkeletonContainer
      syncOffsets
      className={cn(
        PROPERTY_CARD_GRID_CLASS,
        "shimmer-speed-1200 shimmer-repeat-delay-2200",
        className
      )}
      aria-hidden
    >
      {Array.from({ length: PROPERTY_CARD_SKELETON_COUNT }, (_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </SkeletonContainer>
  )
}

function AddPropertyButton({ size = "default" }: { size?: ButtonVariants["size"] }) {
  return (
    <PlanLimitGate resource="properties">
      <LinkButton href={ROUTES.propertyNew} size={size}>
        <PlatformIcon
          icon="IconPlusSmall"
          size={16}
          data-icon="inline-start"
        />
        Add Property
      </LinkButton>
    </PlanLimitGate>
  )
}

export function PropertiesListTemplate() {
  const { data, isLoading } = trpc.properties.list.useQuery()
  const properties = data?.properties ?? []
  const isEmpty = !isLoading && properties.length === 0

  return (
    <Page.Shell>
      <Page.Header>
        <Page.Title>Properties</Page.Title>
        <Page.Actions>
          <AddPropertyButton />
        </Page.Actions>
      </Page.Header>

      <Page.Content>
        {isLoading || isEmpty ? (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden"
              aria-hidden
            >
              <PropertySkeletonGrid className={isEmpty ? "opacity-30" : undefined} />
            </div>
            {isEmpty ? (
              <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
                <div className="flex max-w-md flex-col items-center gap-4 rounded-full px-12 py-12 text-center">
                  <div className="space-y-2">
                    <p className="text-2xl font-mono font-medium text-foreground">
                      No properties yet
                    </p>
                    <p className="text-lg text-muted-foreground">
                      Add your first property to start organizing units and
                      leases.
                    </p>
                  </div>
                  <AddPropertyButton size="sm" />
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <PropertyCardGrid>
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </PropertyCardGrid>
        )}
      </Page.Content>
    </Page.Shell>
  )
}
