"use client"

import { useEffect } from "react"
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
  StatusBadge,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { createUnitInputSchema, updateUnitInputSchema } from "@villuh/server/schemas/units"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@villuh/server/router"
import { getPlanLimitMeta, isPlanLimitError } from "@/modules/app/components/plan-limit/plan-limit-gate"

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
 * Dual-entry create/edit Sheet (Screen 5, D-10). `lockedPropertyId` is set only when opened
 * from `PropertyUnitsSection`'s "Add unit" — the property Select is prefilled + disabled there;
 * global create (`/units`) and edit (row action / unit detail) leave it editable.
 */
export function UnitFormSheet({
  open,
  onOpenChange,
  mode,
  unit,
  lockedPropertyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  /** Required for edit mode — prefills fields and targets the update mutation. */
  unit?: UnitRow
  lockedPropertyId?: string
}) {
  const utils = trpc.useUtils()
  const { data: propertiesData } = trpc.properties.list.useQuery()
  const { data: statusesData } = trpc.unitStatuses.list.useQuery()

  const createUnit = trpc.units.create.useMutation({
    onSuccess: () =>
      invalidateQueries(utils, [(u) => u.units.list, (u) => u.properties.get, (u) => u.me.get]).then(() => {
        toast.success("Unit created")
        onOpenChange(false)
      }),
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
        onOpenChange(false)
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
          await createUnit.mutateAsync(parsed)
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

  // Sheet stays mounted across opens — reset to the (possibly different) unit/lock each time it opens.
  useEffect(() => {
    if (open) form.reset(toFormValues(unit, lockedPropertyId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unit?.id, lockedPropertyId])

  const properties = propertiesData?.properties ?? []
  const statuses = statusesData?.statuses ?? []
  const propertyLocked = Boolean(lockedPropertyId)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "Create unit" : "Edit unit"}</SheetTitle>
        </SheetHeader>
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
        </form>

        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
      </SheetContent>
    </Sheet>
  )
}
