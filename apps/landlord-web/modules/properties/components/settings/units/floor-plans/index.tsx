"use client"

import { Button, EmptyState, PlatformIcon, SkeletonBox } from "@villuh/ui"
import { trpc } from "@villuh/api"
import { useUser } from "@/modules/app/providers/me-provider"
import { propertyOverlays } from "@/modules/properties/lib/properties.overlays"
import { SettingsSection } from "@/modules/properties/components/settings/section"
import { FloorPlanCard } from "./floor-plan-card"

/**
 * The floor plans surface inside property settings → Units: a card grid +
 * "Add floor plan" action + empty state, all inside the existing "Floor
 * plans" `SettingsSection`.
 *
 * The wizard is the `property.floorPlan` overlay: "Add floor plan" opens it
 * in create mode, a card's edit opens it on the plan. Archive is the
 * `property.floorPlanArchive` overlay — opened by id; the confirm fetches the
 * plan's name + unit count itself, and it mounts globally via `<AppOverlays>`.
 */
export function FloorPlansSection({ propertyId }: { propertyId: string }) {
  const { user } = useUser()
  const canWrite = user.org.permissions.write
  const floorPlan = propertyOverlays.use("floorPlan")
  const archive = propertyOverlays.use("floorPlanArchive")

  const listQuery = trpc.floorPlans.list.useQuery({ propertyId })
  const plans = listQuery.data?.floorPlans ?? []

  return (
    <SettingsSection
      title="Floor plans"
      icon="IconRuler"
      description="Reusable unit layouts — bed and bath counts plus an optional default square footage, inherited by every unit that shares the plan."
      className="grid-cols-1 sm:grid-cols-1"
      action={
        canWrite ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => floorPlan.open()}
          >
            <PlatformIcon
              icon="IconPlusSmall"
              size={16}
              data-icon="inline-start"
            />
            Add floor plan
          </Button>
        ) : null
      }
    >
      {listQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SkeletonBox className="h-56 rounded-2xl" />
          <SkeletonBox className="h-56 rounded-2xl" />
          <SkeletonBox className="h-56 rounded-2xl" />
        </div>
      ) : listQuery.isError ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <span>Couldn&apos;t load floor plans.</span>
          <button
            type="button"
            onClick={() => void listQuery.refetch()}
            className="text-foreground underline underline-offset-3 hover:text-foreground"
          >
            Retry
          </button>
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon="IconRuler"
          title="No floor plans yet"
          description="Define a layout once and assign it to matching units instead of re-entering the same details per unit."
          className="rounded-2xl border border-dashed border-border py-12"
          action={
            canWrite ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => floorPlan.open()}
              >
                Add floor plan
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <FloorPlanCard
              key={plan.id}
              canWrite={canWrite}
              plan={{
                id: plan.id,
                name: plan.name,
                bedrooms: plan.bedrooms,
                bathrooms: plan.bathrooms,
                defaultSquareFootage: plan.defaultSquareFootage,
                unitCount: plan.unitCount,
                coverImageUrl: plan.coverImageUrl,
              }}
              onEdit={() => floorPlan.open(plan.id)}
              onArchive={() => archive.open(plan.id)}
            />
          ))}
        </div>
      )}
    </SettingsSection>
  )
}
