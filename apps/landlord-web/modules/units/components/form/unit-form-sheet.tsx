"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"
import { z } from "zod"
import {
  Button,
  Field,
  FieldError,
  FieldLabel,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  OverlayBody,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SkeletonBox,
  SkeletonLabel,
  StatusBadge,
  type EntityOverlayHandle,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { createUnitInputSchema, updateUnitInputSchema } from "@villuh/server/schemas/units"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@villuh/server/router"
import { getPlanLimitMeta, isPlanLimitError } from "@/modules/app/components/plan-limit/plan-limit-gate"
import {
  AmenityPicker,
  type AmenityPickerItem,
} from "@/modules/amenities/components/amenity-picker"

type RouterOutput = inferRouterOutputs<AppRouter>
export type UnitRow = RouterOutput["units"]["get"]["unit"]

const UNASSIGNED_STATUS = "__unassigned__"

type FormValues = {
  propertyId: string
  label: string
  squareFootage: string
  baseRent: string
  statusId: string
}

function toFormValues(unit: UnitRow | undefined, lockedPropertyId: string | undefined): FormValues {
  if (unit) {
    return {
      propertyId: unit.propertyId,
      label: unit.label,
      squareFootage: unit.squareFootage != null ? String(unit.squareFootage) : "",
      baseRent: (unit.baseRent / 100).toFixed(2),
      statusId: unit.statusId ?? UNASSIGNED_STATUS,
    }
  }
  return {
    propertyId: lockedPropertyId ?? "",
    label: "",
    squareFootage: "",
    baseRent: "",
    statusId: UNASSIGNED_STATUS,
  }
}

/**
 * Dual-entry create/edit Sheet, driven entirely by an overlay handle: the
 * param value is the payload (`entityId` for edit, create mode otherwise), so
 * no parent ever hands this component a row object. It fetches its own unit,
 * gated on the overlay being open.
 */
export function UnitFormSheet({ overlay }: { overlay: EntityOverlayHandle }) {
  // Optional param on purpose: this overlay is reachable from /units (no
  // propertyId), /properties/[propertyId]/units, and /units/[unitId].
  const { propertyId } = useParams<{ propertyId?: string }>()

  const unitId = overlay.entityId

  // Gated: ungated, this fires on EVERY authenticated page load, because
  // <AppOverlays> keeps the component mounted app-wide.
  const unitQuery = trpc.units.get.useQuery(
    { unitId: unitId ?? "" },
    { enabled: unitId !== null }
  )

  return (
    <Sheet {...overlay.dialogProps}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{unitId ? "Edit unit" : "Create unit"}</SheetTitle>
        </SheetHeader>
        {unitId === null ? (
          <UnitFormBody
            key="create"
            unit={undefined}
            // Mount context comes from the route, not a prop: on the property
            // Units tab the Select is prefilled and disabled; on /units it is
            // free.
            lockedPropertyId={propertyId}
            onClose={overlay.close}
          />
        ) : (
          <OverlayBody query={unitQuery} pending={<UnitFormSkeleton />}>
            {({ unit }) => (
              <UnitFormBody key={unit.id} unit={unit} onClose={overlay.close} />
            )}
          </OverlayBody>
        )}
      </SheetContent>
    </Sheet>
  )
}

function UnitFormSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <SkeletonLabel className="h-4 w-24" />
          <SkeletonBox className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  )
}

/**
 * The form body. Keyed by the shell (`key="create"` / `key={unit.id}`) so it
 * mounts fresh for each target — `defaultValues` is correct at mount and there
 * is no reset effect to keep in sync (that effect and its eslint disable are
 * gone). `mode` is derived from `unit`, the single source of truth.
 */
function UnitFormBody({
  unit,
  lockedPropertyId,
  onClose,
}: {
  unit?: UnitRow
  lockedPropertyId?: string
  onClose: () => void
}) {
  const mode = unit ? "edit" : "create"
  const utils = trpc.useUtils()

  // Amenities staged locally during create; persisted to the new unit id right
  // after `units.create` returns (mirrors PropertyForm's tags-after-create).
  // In edit mode the AmenityPicker runs live against the existing unit id, so
  // this staged array stays empty and unused.
  const [stagedAmenities, setStagedAmenities] = useState<AmenityPickerItem[]>([])

  // No `enabled` flag: <SheetContent> renders nothing while the sheet is
  // closed, so these never fire until the sheet is open. Do NOT hoist them
  // into the shell above — there they would run app-wide, ungated.
  const { data: propertiesData } = trpc.properties.list.useQuery()
  const { data: statusesData } = trpc.unitStatuses.list.useQuery()

  // Staged-amenity persistence (create path only). `set` for catalog-backed
  // rows (bulk-replace on a fresh unit), `addFreeform` per freeform row.
  const setUnitAmenities = trpc.amenities.unit.set.useMutation()
  const addFreeformUnitAmenity = trpc.amenities.unit.addFreeform.useMutation()

  const createUnit = trpc.units.create.useMutation({
    onError: (err) => {
      if (isPlanLimitError(err)) {
        const meta = getPlanLimitMeta(err)
        toast.error(
          meta
            ? `You've reached your ${meta.resource} limit. Upgrade your plan to continue.`
            : err.message
        )
        return
      }
      toast.error(err.message || "Could not create unit")
    },
  })

  const updateUnit = trpc.units.update.useMutation({
    onSuccess: () =>
      invalidateQueries(utils, [(u) => u.units.list, (u) => u.units.get, (u) => u.properties.get]).then(() => {
        toast.success("Unit saved")
        onClose()
      }),
    onError: (err) => {
      toast.error(err.message || "Could not save unit")
    },
  })

  const isPending = createUnit.isPending || updateUnit.isPending

  const form = useForm({
    defaultValues: toFormValues(unit, lockedPropertyId),
    onSubmit: async ({ value }) => {
      const base = {
        propertyId: value.propertyId,
        label: value.label,
        squareFootage: value.squareFootage.trim() === "" ? undefined : Number(value.squareFootage),
        baseRentCents: Math.round(Number(value.baseRent || "0") * 100),
        statusId: value.statusId === UNASSIGNED_STATUS ? undefined : value.statusId,
      }
      try {
        if (mode === "create") {
          const parsed = createUnitInputSchema.parse(base)
          const created = await createUnit.mutateAsync(parsed)
          const newUnitId = created.unit.id

          // Persist staged amenities to the freshly created unit (D-41). Catalog
          // rows via one `set`; freeform rows one-by-one. Non-fatal: the unit is
          // already created, so a partial amenity failure only warns.
          const catalogAmenityIds = stagedAmenities
            .filter((a) => a.organizationAmenityId)
            .map((a) => a.organizationAmenityId!)
          const freeformAmenities = stagedAmenities.filter(
            (a) => !a.organizationAmenityId
          )
          try {
            if (catalogAmenityIds.length > 0) {
              await setUnitAmenities.mutateAsync({
                unitId: newUnitId,
                organizationAmenityIds: catalogAmenityIds,
              })
            }
            for (const amenity of freeformAmenities) {
              await addFreeformUnitAmenity.mutateAsync({
                unitId: newUnitId,
                label: amenity.label,
                iconKey: amenity.iconKey,
                colorKey: amenity.colorKey,
              })
            }
          } catch {
            toast.error("Unit created, but some amenities could not be saved")
          }

          // D-38: refresh the units list + the per-property amenities map that
          // feeds the new amenities column; keep properties.get + me.get quotas.
          await invalidateQueries(utils, [
            (u) => u.units.list,
            (u) => u.amenities.unit.listByProperty,
            (u) => u.properties.get,
            (u) => u.me.get,
          ])
          toast.success("Unit created")
          onClose()
        } else if (unit) {
          const parsed = updateUnitInputSchema.parse({ unitId: unit.id, ...base })
          await updateUnit.mutateAsync(parsed)
        }
      } catch (err) {
        if (err instanceof z.ZodError) {
          toast.error(err.issues[0]?.message ?? "Please check the form for errors")
          return
        }
        throw err
      }
    },
  })

  const properties = propertiesData?.properties ?? []
  const statuses = statusesData?.statuses ?? []
  const propertyLocked = Boolean(lockedPropertyId)

  return (
    <>
      <form
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-6"
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <form.Field
          name="propertyId"
          validators={{
            onChange: ({ value }) => (value ? undefined : "Property is required"),
            onBlur: ({ value }) => (value ? undefined : "Property is required"),
          }}
        >
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid || undefined}>
                <FieldLabel htmlFor={field.name}>Property</FieldLabel>
                <Select value={field.state.value} onValueChange={field.handleChange} disabled={propertyLocked}>
                  <SelectTrigger id={field.name} className="w-full" aria-invalid={isInvalid || undefined}>
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isInvalid ? (
                  <FieldError
                    errors={field.state.meta.errors.map((err) => ({
                      message: typeof err === "string" ? err : String(err),
                    }))}
                  />
                ) : null}
              </Field>
            )
          }}
        </form.Field>

        <form.Field
          name="label"
          validators={{
            onChange: createUnitInputSchema.shape.label,
            onBlur: createUnitInputSchema.shape.label,
          }}
        >
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid || undefined}>
                <FieldLabel htmlFor={field.name}>Label</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid || undefined}
                />
                {isInvalid ? (
                  <FieldError
                    errors={field.state.meta.errors.map((err) =>
                      typeof err === "string" ? { message: err } : { message: err?.message }
                    )}
                  />
                ) : null}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="squareFootage">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Square footage</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                min={0}
                inputMode="numeric"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="baseRent">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Base rent</FieldLabel>
              <InputGroup>
                <InputGroupAddon>$</InputGroupAddon>
                <InputGroupInput
                  id={field.name}
                  name={field.name}
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </InputGroup>
            </Field>
          )}
        </form.Field>

        <form.Field name="statusId">
          {(field) => {
            const selected = statuses.find((status) => status.id === field.state.value)
            return (
              <Field>
                <FieldLabel htmlFor={field.name}>Status</FieldLabel>
                <div className="flex items-center gap-3">
                  <Select value={field.state.value} onValueChange={field.handleChange}>
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED_STATUS}>Unassigned</SelectItem>
                      {statuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <StatusBadge status={selected ?? null} />
                </div>
              </Field>
            )
          }}
        </form.Field>

        {unit ? (
          <AmenityPicker unitId={unit.id} />
        ) : (
          <AmenityPicker
            context="unit"
            value={stagedAmenities}
            onChange={setStagedAmenities}
          />
        )}
      </form>

      <SheetFooter className="flex-row justify-end gap-2">
        <Button variant="outline" onClick={() => onClose()}>
          {mode === "create" ? "Close without saving" : "Discard changes"}
        </Button>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button
              type="button"
              disabled={!canSubmit || isSubmitting || isPending}
              onClick={() => void form.handleSubmit()}
            >
              {isSubmitting || isPending ? "Saving…" : mode === "create" ? "Create unit" : "Save unit"}
            </Button>
          )}
        </form.Subscribe>
      </SheetFooter>
    </>
  )
}
