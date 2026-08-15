"use client"

import { useSelector } from "@tanstack/react-form"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { z } from "zod"
import {
  SubmitButton,
  WizardDialog,
  WizardDialogBody,
  WizardDialogContainer,
  WizardDialogDescription,
  WizardDialogFooterNav,
  WizardDialogForm,
  WizardDialogPanel,
  WizardDialogSidebar,
  WizardDialogSteps,
  WizardDialogTitle,
  type WizardStep,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { createFloorPlanInputSchema } from "@villuh/server/schemas/floor-plans"
import {
  EMPTY_FLOOR_PLAN_VALUES,
  isDetailsComplete,
  isDuplicateNameError,
  setNameCollisionError,
  useFloorPlanForm,
} from "./floor-plan-form"
import { useFloorPlanGallery } from "./use-floor-plan-gallery"
import { DetailsStep } from "./steps/details-step"
import { GalleryStep } from "./steps/gallery-step"
import { ReviewStep } from "./steps/review-step"

const STEPS: WizardStep[] = [
  { id: "details", label: "Details" },
  { id: "gallery", label: "Photos" },
  { id: "review", label: "Review" },
]

/**
 * Create flow (Screen 4): a linear Details → Photos → Review wizard. One form
 * instance spans every step and the gallery stages in memory, so abandoning the
 * wizard leaves zero rows and zero S3 objects (D-41). Nothing is written until
 * the final Confirm.
 */
export function CreateFloorPlanWizard({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { propertyId } = useParams<{ propertyId?: string }>()
  const utils = trpc.useUtils()
  const gallery = useFloorPlanGallery()

  const propertyQuery = trpc.properties.get.useQuery(
    { propertyId: propertyId ?? "" },
    { enabled: open && Boolean(propertyId) }
  )
  const propertyName = propertyQuery.data?.property.name ?? ""

  const createFloorPlan = trpc.floorPlans.create.useMutation()
  const isPending = createFloorPlan.isPending || gallery.isPersisting

  const form = useFloorPlanForm(
    EMPTY_FLOOR_PLAN_VALUES,
    async ({ value, form }) => {
      try {
        const input = createFloorPlanInputSchema.parse({
          propertyId: propertyId ?? "",
          ...value,
        })
        const { floorPlan } = await createFloorPlan.mutateAsync(input)

        if (gallery.items.length > 0) {
          try {
            await gallery.persist(floorPlan.id)
          } catch {
            toast.error(
              "Floor plan created, but some photos could not be saved"
            )
          }
        }

        // D-47: floor plans are uncapped, so no org-quota invalidation (D-28).
        await invalidateQueries(utils, [
          (u) => u.floorPlans.list,
          (u) => u.floorPlans.get,
          (u) => u.properties.get,
        ])
        toast.success("Floor plan created")
        close()
      } catch (err) {
        if (err instanceof z.ZodError) {
          toast.error(err.issues[0]?.message ?? "Could not create floor plan")
          return
        }
        if (isDuplicateNameError(err)) {
          setNameCollisionError(form)
          return
        }
        toast.error(
          err instanceof Error ? err.message : "Could not create floor plan"
        )
      }
    }
  )

  const canAdvance = useSelector(form.store, (s) => isDetailsComplete(s.values))

  function close() {
    gallery.reset([])
    form.reset(EMPTY_FLOOR_PLAN_VALUES)
    onClose()
  }

  return (
    <WizardDialog
      steps={STEPS}
      mode="linear"
      canAdvance={canAdvance}
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <WizardDialogContainer>
        <WizardDialogSidebar>
          <WizardDialogTitle>New floor plan</WizardDialogTitle>
          <WizardDialogDescription>
            Reusable layouts you can assign to any unit in this property.
          </WizardDialogDescription>
          <WizardDialogSteps />
        </WizardDialogSidebar>

        <WizardDialogForm
          onSubmit={() => void form.handleSubmit()}
          enterAdvances
        >
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
            <WizardDialogPanel step="review">
              <ReviewStep
                form={form}
                items={gallery.items}
                propertyName={propertyName}
              />
            </WizardDialogPanel>
          </WizardDialogBody>

          <WizardDialogFooterNav
            submit={
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <form.Subscribe selector={(state) => state.canSubmit}>
                    {(canSubmit) => (
                      <SubmitButton
                        status={
                          createFloorPlan.isError
                            ? "error"
                            : isSubmitting || isPending
                              ? "pending"
                              : "idle"
                        }
                        disabled={!canSubmit || isSubmitting || isPending}
                        steps={[
                          "Create floor plan",
                          "Creating…",
                          "Created",
                          "Error",
                        ]}
                      />
                    )}
                  </form.Subscribe>
                )}
              </form.Subscribe>
            }
          />
        </WizardDialogForm>
      </WizardDialogContainer>
    </WizardDialog>
  )
}
