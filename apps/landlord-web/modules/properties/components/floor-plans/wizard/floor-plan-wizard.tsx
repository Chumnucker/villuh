"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { useStore } from "@tanstack/react-form"
import { toast } from "sonner"
import { z } from "zod"
import {
  Button,
  PlatformIcon,
  SkeletonBox,
  SubmitButton,
  WizardDialog,
  WizardDialogBody,
  WizardDialogContainer,
  WizardDialogDescription,
  WizardDialogFooter,
  WizardDialogPanel,
  WizardDialogSidebar,
  WizardDialogSteps,
  WizardDialogTitle,
  useWizardDialog,
  type OverlayHandle,
  type WizardStep,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import {
  createFloorPlanInputSchema,
  updateFloorPlanInputSchema,
} from "@villuh/server/schemas/floor-plans"
import {
  persistStagedGallery,
  revokeStagedBlobUrls,
  type StagedGalleryItem,
} from "@/modules/properties/lib/staged-gallery"
import { submitStatus } from "@/modules/properties/components/form/property-form-shared"
import {
  EMPTY_FLOOR_PLAN_VALUES,
  toCreateInput,
  toFloorPlanFormValues,
  toUpdateInput,
  useFloorPlanFormInstance,
  type FloorPlanFormApi,
} from "./floor-plan-form"
import { DetailsStep } from "./details-step"
import { GalleryStep } from "./gallery-step"
import { ReviewStep } from "./review-step"

const CREATE_STEPS: WizardStep[] = [
  { id: "details", label: "Details" },
  { id: "gallery", label: "Photos" },
  { id: "review", label: "Review" },
]

const EDIT_STEPS: WizardStep[] = [
  { id: "details", label: "Details" },
  { id: "gallery", label: "Photos" },
]

const DUPLICATE_NAME_MESSAGE =
  "A floor plan with this name already exists in this property."

/** Any `BAD_REQUEST` from create/update is the per-property unique-name violation (D-09). */
function isDuplicateNameError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "data" in err &&
    typeof (err as { data?: unknown }).data === "object" &&
    (err as { data?: { code?: string } }).data?.code === "BAD_REQUEST"
  )
}

/**
 * The floor-plan wizard (Screens 4–5). One overlay whose value is the payload:
 * `"new"` opens the create flow (linear, Details → Photos → Review), a plan id
 * opens the edit flow (free, Details → Photos, no Review — D-42). Both share one
 * `@tanstack/react-form` instance and the staged-gallery pattern, so an
 * abandoned wizard leaves zero rows and zero S3 objects (D-41).
 *
 * Create and edit render as two independent `WizardDialog` roots so each keeps
 * its own `mode`, steps, and form; only one is ever open at a time.
 */
export function FloorPlanWizard({ overlay }: { overlay: OverlayHandle }) {
  const isCreate = overlay.value === "new"
  const floorPlanId =
    overlay.value && overlay.value !== "new" ? overlay.value : null

  return (
    <>
      <CreateFloorPlanWizard
        open={overlay.isOpen && isCreate}
        onClose={overlay.close}
      />
      <EditFloorPlanWizard
        open={overlay.isOpen && floorPlanId !== null}
        floorPlanId={floorPlanId}
        onClose={overlay.close}
      />
    </>
  )
}

/* ── Create ──────────────────────────────────────────────────────────────── */

function CreateFloorPlanWizard({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { propertyId } = useParams<{ propertyId?: string }>()
  const utils = trpc.useUtils()

  const [step, setStep] = useState("details")
  const [items, setItems] = useState<StagedGalleryItem[]>([])
  const [nameError, setNameError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState(false)
  const [isPersistingGallery, setIsPersistingGallery] = useState(false)

  // Latest items snapshot for the unmount-only blob-URL cleanup.
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])
  useEffect(() => {
    return () => revokeStagedBlobUrls(itemsRef.current)
  }, [])

  const propertyQuery = trpc.properties.get.useQuery(
    { propertyId: propertyId ?? "" },
    { enabled: open && Boolean(propertyId) }
  )
  const propertyName = propertyQuery.data?.property.name ?? ""

  const createFloorPlan = trpc.floorPlans.create.useMutation()
  const presign = trpc.uploads.presignFloorPlanImage.useMutation()
  const addImage = trpc.floorPlans.gallery.add.useMutation()
  const removeImage = trpc.floorPlans.gallery.remove.useMutation()
  const reorderImages = trpc.floorPlans.gallery.reorder.useMutation()

  const isPending = createFloorPlan.isPending || isPersistingGallery
  const isError = submitError || createFloorPlan.isError

  const form = useFloorPlanFormInstance(
    EMPTY_FLOOR_PLAN_VALUES,
    async ({ value }) => {
      setSubmitError(false)
      setNameError(null)
      try {
        const parsed = createFloorPlanInputSchema.parse(
          toCreateInput(value, propertyId ?? "")
        )
        const { floorPlan } = await createFloorPlan.mutateAsync(parsed)

        if (items.length > 0) {
          setIsPersistingGallery(true)
          try {
            await persistStagedGallery({
              items,
              removedExistingIds: [],
              presign: (input) =>
                presign.mutateAsync({ floorPlanId: floorPlan.id, ...input }),
              add: (input) =>
                addImage.mutateAsync({ floorPlanId: floorPlan.id, ...input }),
              remove: (input) =>
                removeImage.mutateAsync({ floorPlanId: floorPlan.id, ...input }),
              reorder: (input) =>
                reorderImages.mutateAsync({ floorPlanId: floorPlan.id, ...input }),
            })
          } catch {
            toast.error("Floor plan created, but some photos could not be saved")
          } finally {
            setIsPersistingGallery(false)
          }
        }

        // D-47: floor plans are uncapped, so no org-quota invalidation (D-28).
        await invalidateQueries(utils, [
          (u) => u.floorPlans.list,
          (u) => u.floorPlans.get,
          (u) => u.properties.get,
        ])
        toast.success("Floor plan created")
        closeAndReset()
      } catch (err) {
        if (err instanceof z.ZodError) {
          toast.error(err.issues[0]?.message ?? "Could not create floor plan")
          return
        }
        if (isDuplicateNameError(err)) {
          setNameError(DUPLICATE_NAME_MESSAGE)
          setStep("details")
          return
        }
        setSubmitError(true)
        toast.error(
          err instanceof Error ? err.message : "Could not create floor plan"
        )
      }
    }
  )

  const values = useStore(form.store, (state) => state.values)
  const detailsValid =
    createFloorPlanInputSchema.shape.name.safeParse(values.name).success &&
    values.bedrooms !== "" &&
    values.bathrooms !== ""
  const canAdvance = step === "details" ? detailsValid : true

  function resetLocalState() {
    revokeStagedBlobUrls(items)
    setItems([])
    setStep("details")
    setNameError(null)
    setSubmitError(false)
    form.reset(EMPTY_FLOOR_PLAN_VALUES)
  }

  function closeAndReset() {
    resetLocalState()
    onClose()
  }

  return (
    <WizardDialog
      steps={CREATE_STEPS}
      mode="linear"
      canAdvance={canAdvance}
      step={step}
      onStepChange={setStep}
      open={open}
      onOpenChange={(next) => {
        if (!next) closeAndReset()
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

        <WizardRightColumn
          form={form}
          enterAdvances
          panels={
            <>
              <WizardDialogPanel step="details">
                <DetailsStep
                  form={form}
                  nameError={nameError}
                  onNameChange={() => setNameError(null)}
                />
              </WizardDialogPanel>
              <WizardDialogPanel step="gallery">
                <GalleryStep
                  items={items}
                  onChange={setItems}
                  onRemoveExisting={() => {
                    // Create mode has no persisted images to remove.
                  }}
                />
              </WizardDialogPanel>
              <WizardDialogPanel step="review">
                <ReviewStep
                  form={form}
                  items={items}
                  propertyName={propertyName}
                />
              </WizardDialogPanel>
            </>
          }
          footer={
            <CreateFooter
              form={form}
              canAdvance={canAdvance}
              isPending={isPending}
              isError={isError}
            />
          }
        />
      </WizardDialogContainer>
    </WizardDialog>
  )
}

/* ── Edit ────────────────────────────────────────────────────────────────── */

function EditFloorPlanWizard({
  open,
  floorPlanId,
  onClose,
}: {
  open: boolean
  floorPlanId: string | null
  onClose: () => void
}) {
  const planQuery = trpc.floorPlans.get.useQuery(
    { floorPlanId: floorPlanId ?? "" },
    { enabled: open && floorPlanId !== null }
  )
  const galleryQuery = trpc.floorPlans.gallery.list.useQuery(
    { floorPlanId: floorPlanId ?? "" },
    { enabled: open && floorPlanId !== null }
  )

  const ready = planQuery.data != null && galleryQuery.data != null

  return (
    <WizardDialog
      steps={EDIT_STEPS}
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
        ) : ready ? (
          <EditFloorPlanBody
            key={floorPlanId ?? "edit"}
            plan={planQuery.data}
            images={galleryQuery.data.images}
            onClose={onClose}
          />
        ) : (
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
        )}
      </WizardDialogContainer>
    </WizardDialog>
  )
}

type EditablePlan = {
  id: string
  propertyId: string
  name: string
  bedrooms: number
  bathrooms: number
  defaultSquareFootage: number | null
}

type ExistingImage = { id: string; objectKey: string; url: string }

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
  const { goTo } = useWizardDialog()

  const initialItems: StagedGalleryItem[] = images.map((image) => ({
    kind: "existing",
    localId: image.id,
    id: image.id,
    objectKey: image.objectKey,
    url: image.url,
  }))

  const [items, setItems] = useState<StagedGalleryItem[]>(initialItems)
  const [removedExistingIds, setRemovedExistingIds] = useState<string[]>([])
  const [nameError, setNameError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState(false)
  const [isPersistingGallery, setIsPersistingGallery] = useState(false)

  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])
  useEffect(() => {
    return () => revokeStagedBlobUrls(itemsRef.current)
  }, [])

  const updateFloorPlan = trpc.floorPlans.update.useMutation()
  const presign = trpc.uploads.presignFloorPlanImage.useMutation()
  const addImage = trpc.floorPlans.gallery.add.useMutation()
  const removeImage = trpc.floorPlans.gallery.remove.useMutation()
  const reorderImages = trpc.floorPlans.gallery.reorder.useMutation()

  const isPending = updateFloorPlan.isPending || isPersistingGallery
  const isError = submitError || updateFloorPlan.isError

  const form = useFloorPlanFormInstance(
    toFloorPlanFormValues(plan),
    async ({ value, formApi }) => {
      setSubmitError(false)
      setNameError(null)
      try {
        const parsed = updateFloorPlanInputSchema.parse(
          toUpdateInput(value, plan.id)
        )
        await updateFloorPlan.mutateAsync(parsed)

        setIsPersistingGallery(true)
        try {
          await persistStagedGallery({
            items,
            removedExistingIds,
            presign: (input) =>
              presign.mutateAsync({ floorPlanId: plan.id, ...input }),
            add: (input) =>
              addImage.mutateAsync({ floorPlanId: plan.id, ...input }),
            remove: (input) =>
              removeImage.mutateAsync({ floorPlanId: plan.id, ...input }),
            reorder: (input) =>
              reorderImages.mutateAsync({ floorPlanId: plan.id, ...input }),
          })
        } finally {
          setIsPersistingGallery(false)
        }

        await invalidateQueries(utils, [
          (u) => u.floorPlans.list,
          (u) => u.floorPlans.get,
          (u) => u.properties.get,
        ])
        formApi.reset(value)
        toast.success("Floor plan saved")
        onClose()
      } catch (err) {
        if (err instanceof z.ZodError) {
          toast.error(err.issues[0]?.message ?? "Could not save floor plan")
          return
        }
        if (isDuplicateNameError(err)) {
          setNameError(DUPLICATE_NAME_MESSAGE)
          goTo("details")
          return
        }
        setSubmitError(true)
        toast.error(
          err instanceof Error ? err.message : "Could not save floor plan"
        )
      }
    }
  )

  function handleDiscard() {
    // Restore the originally-loaded staged items; drop any locally-added blobs.
    for (const item of items) {
      if (item.kind === "new") URL.revokeObjectURL(item.previewUrl)
    }
    setItems(initialItems)
    setRemovedExistingIds([])
    setNameError(null)
    setSubmitError(false)
    form.reset()
  }

  return (
    <WizardRightColumn
      form={form}
      panels={
        <>
          <WizardDialogPanel step="details">
            <DetailsStep
              form={form}
              nameError={nameError}
              onNameChange={() => setNameError(null)}
            />
          </WizardDialogPanel>
          <WizardDialogPanel step="gallery">
            <GalleryStep
              items={items}
              onChange={setItems}
              onRemoveExisting={(imageId) =>
                setRemovedExistingIds((prev) => [...prev, imageId])
              }
            />
          </WizardDialogPanel>
        </>
      }
      footer={
        <EditFooter
          form={form}
          isPending={isPending}
          isError={isError}
          onDiscard={handleDiscard}
        />
      }
    />
  )
}

/* ── Shared right column + footers ─────────────────────────────────────────── */

/**
 * The wizard's right column: the consumer-owned `<form>` (D-30, plan 05) plus
 * the scrolling body (step panels) and the footer. `enterAdvances` implements
 * the "Enter must not submit" contract for the linear create flow — Enter
 * advances a step rather than creating the plan; the free edit flow submits on
 * Enter (it has no Next).
 */
function WizardRightColumn({
  form,
  enterAdvances = false,
  panels,
  footer,
}: {
  form: FloorPlanFormApi
  enterAdvances?: boolean
  panels: React.ReactNode
  footer: React.ReactNode
}) {
  const { isLast, next } = useWizardDialog()
  return (
    <form
      className="flex min-w-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (enterAdvances && !isLast) {
          next()
          return
        }
        void form.handleSubmit()
      }}
    >
      <WizardDialogBody>{panels}</WizardDialogBody>
      {footer}
    </form>
  )
}

function CreateFooter({
  form,
  canAdvance,
  isPending,
  isError,
}: {
  form: FloorPlanFormApi
  canAdvance: boolean
  isPending: boolean
  isError: boolean
}) {
  const { isFirst, isLast, back, next } = useWizardDialog()
  return (
    <WizardDialogFooter>
      {!isFirst ? (
        <Button type="button" variant="outline" onClick={back}>
          <PlatformIcon icon="IconChevronLeft" size={16} data-icon="inline-start" />
          Back
        </Button>
      ) : null}

      <form.Subscribe
        selector={(state) => [state.isSubmitting, state.canSubmit] as const}
      >
        {([isSubmitting, canSubmit]) =>
          isLast ? (
            <SubmitButton
              status={submitStatus(isSubmitting, isPending, isError)}
              disabled={!canSubmit || isSubmitting || isPending}
              steps={["Create floor plan", "Creating…", "Created", "Error"]}
            />
          ) : (
            <Button type="button" onClick={next} disabled={!canAdvance}>
              Next
              <PlatformIcon
                icon="IconChevronRight"
                size={16}
                data-icon="inline-end"
              />
            </Button>
          )
        }
      </form.Subscribe>
    </WizardDialogFooter>
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
      <form.Subscribe
        selector={(state) =>
          [state.isSubmitting, state.canSubmit, state.isDirty] as const
        }
      >
        {([isSubmitting, canSubmit, isDirty]) => (
          <>
            {isDirty ? (
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || isPending}
                onClick={onDiscard}
              >
                Discard changes
              </Button>
            ) : null}
            <SubmitButton
              status={submitStatus(isSubmitting, isPending, isError)}
              disabled={!canSubmit || isSubmitting || isPending}
              steps={["Save changes", "Saving…", "Saved", "Error"]}
            />
          </>
        )}
      </form.Subscribe>
    </WizardDialogFooter>
  )
}
