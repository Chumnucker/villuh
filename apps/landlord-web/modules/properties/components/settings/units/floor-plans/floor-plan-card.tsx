"use client"

import {
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  PlatformIcon,
} from "@villuh/ui"
import {
  formatFloorPlanSpecs,
  formatUnitCount,
} from "@/modules/properties/lib/floor-plan-display"

export type FloorPlanCardData = {
  id: string
  name: string
  bedrooms: number
  bathrooms: number
  defaultSquareFootage: number | null
  unitCount: number
  coverImageUrl: string | null
}

const FOCUS_RING =
  "focus-visible:ring-1 focus-visible:ring-ring/35 focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:outline-none"

/**
 * Screen 3 (D-39). Cover, name, spec line, unit count, and an overflow menu.
 *
 * Two sibling targets (cover, name) + a sibling menu — never one card-wide
 * button, which would nest the menu trigger inside a button (invalid HTML,
 * broken keyboard activation). Without `write`, the tile is read-only: no
 * buttons, no menu.
 */
export function FloorPlanCard({
  plan,
  canWrite,
  onEdit,
  onArchive,
}: {
  plan: FloorPlanCardData
  canWrite: boolean
  onEdit: () => void
  onArchive: () => void
}) {
  const specLine = formatFloorPlanSpecs({
    bedrooms: plan.bedrooms,
    bathrooms: plan.bathrooms,
    squareFootage: plan.defaultSquareFootage,
  })

  return (
    <Card className="transition-shadow hover:ring-1 hover:ring-foreground/10">
      {canWrite ? (
        <button
          type="button"
          aria-label={`Edit ${plan.name}`}
          onClick={onEdit}
          className={`relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden bg-muted ${FOCUS_RING}`}
        >
          <CoverInner plan={plan} />
        </button>
      ) : (
        <div className="relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden bg-muted">
          <CoverInner plan={plan} />
        </div>
      )}

      <CardContent className="flex items-start justify-between gap-2 p-4">
        <div className="flex min-w-0 flex-col gap-1">
          {canWrite ? (
            <button
              type="button"
              onClick={onEdit}
              title={plan.name}
              className={`truncate text-left text-sm font-medium text-foreground hover:underline ${FOCUS_RING}`}
            >
              {plan.name}
            </button>
          ) : (
            <p
              title={plan.name}
              className="truncate text-sm font-medium text-foreground"
            >
              {plan.name}
            </p>
          )}
          <p className="text-sm text-muted-foreground">{specLine}</p>
          <p className="text-sm text-muted-foreground">
            {formatUnitCount(plan.unitCount)}
          </p>
        </div>

        {canWrite ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <PlatformIcon icon="IconDotGrid1x3Horizontal" size={16} />
                <span className="sr-only">Floor plan actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <PlatformIcon icon="IconPencil" size={16} />
                Edit floor plan
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={onArchive}>
                <PlatformIcon icon="IconArchive" size={16} />
                Archive floor plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </CardContent>
    </Card>
  )
}

function CoverInner({ plan }: { plan: FloorPlanCardData }) {
  if (plan.coverImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs are short-lived and per-org; not worth Next/Image remote-pattern config.
      <img src={plan.coverImageUrl} alt="" className="size-full object-cover" />
    )
  }
  return (
    <PlatformIcon icon="IconRuler" size={28} className="text-muted-foreground" />
  )
}
