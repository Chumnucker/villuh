"use client"

import { toast } from "sonner"
import { z } from "zod"
import {
  Button,
  SkeletonBox,
  SubmitButton,
  WizardDialog,
  WizardDialogBody,
  WizardDialogContainer,
  WizardDialogDescription,
  WizardDialogFooter,
  WizardDialogForm,
  WizardDialogPanel,
  WizardDialogSidebar,
  WizardDialogSteps,
  WizardDialogTitle,
  type WizardStep,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { updateFloorPlanInputSchema } from "@villuh/server/schemas/floor-plans"
import type { StagedGalleryItem } from "@/modules/properties/lib/staged-gallery"
import {
  isDuplicateNameError,
  setNameCollisionError,
  useFloorPlanForm,
  type FloorPlanFormApi,
  type FloorPlanFormValues,
} from "./floor-plan-form"
import { useFloorPlanGallery } from "./use-floor-plan-gallery"
import { DetailsStep } from "./steps/details-step"
import { GalleryStep } from "./steps/gallery-step"

const STEPS: WizardStep[] = [
  { id: "details", label: "Details" },
  { id: "gallery", label: "Photos" },
]

type EditablePlan = {
  id: string
  propertyId: string
  name: string
  bedrooms: number
  bathrooms: number
  defaultSquareFootage: number | null
}

type ExistingImage = { id: string; objectKey: string; url: string }

/**
 * Edit flow (Screen 5): a free-navigation Details → Photos wizard with no Review
 * gate (D-42). Values load from the plan, existing images seed the staged
 * gallery, and removals hard-delete on Save. The data-loading shell keeps the
 * body unmounted (and its form/gallery unseeded) until both queries resolve.
 */
export function EditFloorPlanWizard({
  open,
  floorPlanId,
  onClose,
}: {
  open: boolean
  floorPlanId: string | null
  onClose: () => void
}) {
  const enabled = open && floorPlanId !== null
  const planQuery = trpc.floorPlans.get.useQuery(
    { floorPlanId: floorPlanId ?? "" },
    { enabled }
  )
  const galleryQuery = trpc.floorPlans.gallery.list.useQuery(
    { floorPlanId: floorPlanId ?? "" },
    { enabled }
  )

  const ready = planQuery.data != null && galleryQuery.data != null

  return (
    <WizardDialog
      steps={STEPS}
      mode="free"
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <WizardDialogContainer>
        <WizardDialogSidebar>
          <WizardDialogTitle>Edit floor plan</WizardDialogTitle>
          <WizardDialogDescription>
            Changes apply to every unit that hasn&apos;t overridden them.
          </WizardDialogDescription>
          <WizardDialogSteps />
        </WizardDialogSidebar>

        {planQuery.isError ? (
          <NotFoundBody onClose={onClose} />
        ) : ready ? (
          <EditFloorPlanBody
            key={floorPlanId ?? "edit"}
            plan={planQuery.data}
            images={galleryQuery.data.images}
            onClose={onClose}
          />
        ) : (
          <LoadingBody />
        )}
      </WizardDialogContainer>
    </WizardDialog>
  )
}

function EditFloorPlanBody({
  plan,
  images,
  onClose,
}: {
  plan: EditablePlan
  images: ExistingImage[]
  onClose: () => void
}) {
  const utils = trpc.useUtils()

  const initialItems: StagedGalleryItem[] = images.map((image) => ({
    kind: "existing",
    localId: image.id,
    id: image.id,
    objectKey: image.objectKey,
    url: image.url,
  }))

  const gallery = useFloorPlanGallery(initialItems)
  const updateFloorPlan = trpc.floorPlans.update.useMutation()
  const isPending = updateFloorPlan.isPending || gallery.isPersisting

  const initialValues: FloorPlanFormValues = {
    name: plan.name,
    bedrooms: plan.bedrooms,
    bathrooms: plan.bathrooms,
    defaultSquareFootage: plan.defaultSquareFootage ?? undefined,
  }

  const form = useFloorPlanForm(initialValues, async ({ value, form }) => {
    try {
      const parsed = updateFloorPlanInputSchema.parse({
        floorPlanId: plan.id,
        ...value,
      })
      await updateFloorPlan.mutateAsync(parsed)
      await gallery.persist(plan.id)

      await invalidateQueries(utils, [
        (u) => u.floorPlans.list,
        (u) => u.floorPlans.get,
        (u) => u.properties.get,
      ])
      form.reset(value)
      toast.success("Floor plan saved")
      onClose()
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.issues[0]?.message ?? "Could not save floor plan")
        return
      }
      if (isDuplicateNameError(err)) {
        setNameCollisionError(form)
        return
      }
      toast.error(
        err instanceof Error ? err.message : "Could not save floor plan"
      )
    }
  })

  function handleDiscard() {
    gallery.reset(initialItems)
    form.reset()
  }

  return (
    <WizardDialogForm onSubmit={() => void form.handleSubmit()}>
      <WizardDialogBody>
        <WizardDialogPanel step="details">
          <DetailsStep form={form} />
        </WizardDialogPanel>
        <WizardDialogPanel step="gallery">
          <GalleryStep
            items={gallery.items}
            onChange={gallery.setItems}
            onRemoveExisting={gallery.markExistingRemoved}
          />
        </WizardDialogPanel>
      </WizardDialogBody>
      <EditFooter
        form={form}
        isPending={isPending}
        isError={updateFloorPlan.isError}
        onDiscard={handleDiscard}
      />
    </WizardDialogForm>
  )
}

function EditFooter({
  form,
  isPending,
  isError,
  onDiscard,
}: {
  form: FloorPlanFormApi
  isPending: boolean
  isError: boolean
  onDiscard: () => void
}) {
  return (
    <WizardDialogFooter>
      {/*
        Primitive selectors only — TanStack Store compares with `===`, so a fresh
        array (`[isSubmitting, canSubmit, isDirty]`) would re-render on every
        keystroke. `isSubmitting` is shared by both buttons, so it wraps the pair.
      */}
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <>
            <form.Subscribe selector={(state) => state.isDirty}>
              {(isDirty) =>
                isDirty ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting || isPending}
                    onClick={onDiscard}
                  >
                    Discard changes
                  </Button>
                ) : null
              }
            </form.Subscribe>
            <form.Subscribe selector={(state) => state.canSubmit}>
              {(canSubmit) => (
                <SubmitButton
                  status={
                    isError
                      ? "error"
                      : isSubmitting || isPending
                        ? "pending"
                        : "idle"
                  }
                  disabled={!canSubmit || isSubmitting || isPending}
                  steps={["Save changes", "Saving…", "Saved", "Error"]}
                />
              )}
            </form.Subscribe>
          </>
        )}
      </form.Subscribe>
    </WizardDialogFooter>
  )
}

function LoadingBody() {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <WizardDialogBody>
        <div className="flex flex-col gap-4">
          <SkeletonBox className="h-9 w-full rounded-md" />
          <SkeletonBox className="h-9 w-full rounded-md" />
          <SkeletonBox className="h-40 w-full rounded-2xl" />
        </div>
      </WizardDialogBody>
      <WizardDialogFooter>
        <SubmitButton
          status="idle"
          disabled
          steps={["Save changes", "Saving…", "Saved", "Error"]}
        />
      </WizardDialogFooter>
    </div>
  )
}

function NotFoundBody({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <WizardDialogBody>
        <p className="text-sm text-muted-foreground">
          This floor plan no longer exists. It may have been deleted.
        </p>
      </WizardDialogBody>
      <WizardDialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </WizardDialogFooter>
    </div>
  )
}
