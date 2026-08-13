"use client"

import { useState } from "react"
import { Button, EmptyState, PlatformIcon, SkeletonBox } from "@villuh/ui"
import { trpc } from "@villuh/api"
import { useUser } from "@/modules/app/providers/me-provider"
import { propertyOverlays } from "@/modules/properties/lib/properties.overlays"
import { SettingsSection } from "@/modules/properties/components/settings/section"
import { FloorPlanCard } from "./floor-plan-card"
import {
  ArchiveFloorPlanDialog,
  type ArchiveFloorPlanTarget,
} from "./archive-floor-plan-dialog"

/**
 * Screen 2 (D-38). The floor plans surface inside property settings → Units.
 * A card grid + "Add floor plan" action + empty state, all inside the existing
 * "Floor plans" `SettingsSection`. No new route, no new template file — the
 * settings template mounts this in place of its placeholder.
 *
 * The wizard is an overlay (`property.floorPlan`, value `new` | plan id, D-01):
 * "Add floor plan" opens it in create mode, a card's edit opens it on the plan.
 * Archive is a locally-controlled standard `Dialog` (not an overlay) — the list
 * row already carries the name + unit count the confirm copy needs.
 */
export function FloorPlansSection({ propertyId }: { propertyId: string }) {
  const { user } = useUser()
  const canWrite = user.org.permissions.write
  const floorPlan = propertyOverlays.use("floorPlan")

  const listQuery = trpc.floorPlans.list.useQuery({ propertyId })
  const plans = listQuery.data?.floorPlans ?? []

  const [archiveTarget, setArchiveTarget] =
    useState<ArchiveFloorPlanTarget | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)

  function openArchive(target: ArchiveFloorPlanTarget) {
    setArchiveTarget(target)
    setArchiveOpen(true)
  }

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
            <PlatformIcon icon="IconPlusSmall" size={16} data-icon="inline-start" />
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
              onArchive={() =>
                openArchive({
                  id: plan.id,
                  name: plan.name,
                  unitCount: plan.unitCount,
                })
              }
            />
          ))}
        </div>
      )}

      <ArchiveFloorPlanDialog
        plan={archiveTarget}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
      />
    </SettingsSection>
  )
}
