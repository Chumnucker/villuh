"use client"

import { useSelector } from "@tanstack/react-form"
import { Button, PlatformIcon, useWizardDialog } from "@villuh/ui"
import { formatFloorPlanSpecs } from "@/modules/properties/lib/floor-plan-display"
import {
  stagedItemPreviewUrl,
  type StagedGalleryItem,
} from "@/modules/properties/lib/staged-gallery"
import type { FloorPlanFormApi } from "../floor-plan-form"

const MAX_THUMBNAILS = 6

function imageCountCopy(count: number): string {
  if (count === 0) return "No photos"
  if (count === 1) return "1 photo"
  return `${count} photos`
}

/**
 * Review step (UI-SPEC §4.3, create mode only — D-42). Two bordered blocks that
 * read **live form values** (D-35): the single form instance spanning the
 * wizard means the spec line here reflects whatever Details currently holds,
 * with no re-plumbing. Each block header carries a ghost Edit affordance that
 * jumps back via `goTo` (always permitted — reaching Review means every prior
 * step was visited).
 */
export function ReviewStep({
  form,
  items,
  propertyName,
}: {
  form: FloorPlanFormApi
  items: StagedGalleryItem[]
  propertyName: string
}) {
  const { goTo } = useWizardDialog()
  const values = useSelector(form.store, (state) => state.values)

  const specLine = formatFloorPlanSpecs({
    bedrooms: values.bedrooms ?? 0,
    bathrooms: values.bathrooms ?? 0,
    squareFootage: values.defaultSquareFootage ?? null,
  })

  const cover = items[0]
  const thumbnails = items.slice(1, 1 + MAX_THUMBNAILS)
  const overflow = Math.max(0, items.length - 1 - MAX_THUMBNAILS)

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">Details</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => goTo("details")}
          >
            <PlatformIcon
              icon="IconPencil"
              size={14}
              data-icon="inline-start"
            />
            Edit
          </Button>
        </div>
        <p className="mt-2 font-heading text-base font-medium text-foreground">
          {values.name}
        </p>
        <p className="text-sm text-muted-foreground">{specLine}</p>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <PlatformIcon icon="IconBuildings" size={14} />
          In {propertyName}
        </p>
      </section>

      <section className="rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">Photos</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => goTo("gallery")}
          >
            <PlatformIcon
              icon="IconPencil"
              size={14}
              data-icon="inline-start"
            />
            Edit
          </Button>
        </div>

        {cover ? (
          <div className="mt-3 flex flex-col gap-2">
            <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl ring-1 ring-border">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob or short-lived presigned URL */}
              <img
                src={stagedItemPreviewUrl(cover)}
                alt=""
                className="size-full object-cover"
              />
            </div>
            {thumbnails.length > 0 || overflow > 0 ? (
              <div className="flex gap-2 overflow-x-auto">
                {thumbnails.map((item) => (
                  <div
                    key={item.localId}
                    className="size-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- blob or short-lived presigned URL */}
                    <img
                      src={stagedItemPreviewUrl(item)}
                      alt=""
                      className="size-full object-cover"
                    />
                  </div>
                ))}
                {overflow > 0 ? (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
                    +{overflow}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <p className="mt-2 text-sm text-muted-foreground">
          {imageCountCopy(items.length)}
        </p>
      </section>
    </div>
  )
}
