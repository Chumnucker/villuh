"use client"

import * as React from "react"
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"
import { z } from "zod"
import {
  Button,
  Field,
  FieldError,
  FieldLabel,
  Input,
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
  Switch,
  Textarea,
  type EntityOverlayHandle,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import {
  createTenantInputSchema,
  createTenancyInputSchema,
  updateTenantInputSchema,
} from "@villuh/server/schemas/tenants"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@villuh/server/router"
import { CoTenantPicker, type CoTenantSelection } from "./co-tenant-picker"

type RouterOutput = inferRouterOutputs<AppRouter>
export type TenantRow = RouterOutput["tenants"]["get"]["tenant"]

type FormValues = {
  firstName: string
  lastName: string
  email: string
  phone: string
  notes: string
}

const TENANCY_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
] as const

function toFormValues(tenant: TenantRow | undefined): FormValues {
  if (tenant) {
    return {
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email,
      phone: tenant.phone ?? "",
      notes: tenant.notes ?? "",
    }
  }
  return { firstName: "", lastName: "", email: "", phone: "", notes: "" }
}

/**
 * Dual-entry create/edit Sheet driven by an overlay handle: the param value is
 * the payload (`entityId` for edit, create mode otherwise), so no parent hands
 * this component a row. It fetches its own tenant, gated on the overlay being
 * open. Mirrors `unit-form-sheet.tsx`.
 */
export function TenantFormSheet({ overlay }: { overlay: EntityOverlayHandle }) {
  const tenantId = overlay.entityId

  // Gated on open: <AppOverlays> keeps this mounted app-wide, so an ungated
  // query would fire on every authenticated page load.
  const tenantQuery = trpc.tenants.get.useQuery(
    { tenantId: tenantId ?? "" },
    { enabled: tenantId !== null }
  )

  return (
    <Sheet {...overlay.dialogProps}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{tenantId ? "Edit tenant" : "Create tenant"}</SheetTitle>
        </SheetHeader>
        {tenantId === null ? (
          <TenantFormBody key="create" tenant={undefined} onClose={overlay.close} />
        ) : (
          <OverlayBody query={tenantQuery} pending={<TenantFormSkeleton />}>
            {({ tenant }) => (
              <TenantFormBody key={tenant.id} tenant={tenant} onClose={overlay.close} />
            )}
          </OverlayBody>
        )}
      </SheetContent>
    </Sheet>
  )
}

function TenantFormSkeleton() {
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
 * The form body, keyed by the shell so it mounts fresh per target.
 * `mode` derives from `tenant`. In create mode an optional "Assign to unit"
 * section chains `tenants.createTenancy` after the tenant is created, using the
 * new tenant id as the primary member.
 */
function TenantFormBody({
  tenant,
  onClose,
}: {
  tenant?: TenantRow
  onClose: () => void
}) {
  const mode = tenant ? "edit" : "create"
  const utils = trpc.useUtils()

  const [assignUnit, setAssignUnit] = React.useState(false)
  const [unitId, setUnitId] = React.useState("")
  const [status, setStatus] = React.useState<"pending" | "active">("pending")
  const [startDate, setStartDate] = React.useState("")
  const [coTenants, setCoTenants] = React.useState<CoTenantSelection>({
    memberTenantIds: [],
    primaryTenantId: null,
  })

  // Ungated on purpose: <SheetContent> renders nothing while closed, so this
  // never fires until the sheet is open.
  const { data: unitsData } = trpc.units.list.useQuery()
  const units = unitsData?.units ?? []

  const createTenant = trpc.tenants.create.useMutation()
  const updateTenant = trpc.tenants.update.useMutation()
  const createTenancy = trpc.tenants.createTenancy.useMutation()

  const isPending =
    createTenant.isPending || updateTenant.isPending || createTenancy.isPending

  const form = useForm({
    defaultValues: toFormValues(tenant),
    onSubmit: async ({ value }) => {
      const base = {
        firstName: value.firstName,
        lastName: value.lastName,
        email: value.email,
        phone: value.phone.trim() === "" ? undefined : value.phone.trim(),
        notes: value.notes.trim() === "" ? undefined : value.notes.trim(),
      }
      try {
        if (mode === "create") {
          const parsed = createTenantInputSchema.parse(base)
          const { tenant: created } = await createTenant.mutateAsync(parsed)

          if (assignUnit && unitId) {
            const tenancyInput = createTenancyInputSchema.parse({
              unitId,
              status,
              startDate: startDate.trim() === "" ? undefined : startDate,
              // The new tenant is always the primary; the picker contributes
              // only additional members (see CoTenantPicker `allowPrimary`).
              memberTenantIds: [created.id, ...coTenants.memberTenantIds],
              primaryTenantId: created.id,
            })
            await createTenancy.mutateAsync(tenancyInput)
          }

          await invalidateQueries(utils, [
            (u) => u.tenants.list,
            (u) => u.tenants.get,
            (u) => u.units.list,
          ])
          toast.success("Tenant created")
          onClose()
        } else if (tenant) {
          const parsed = updateTenantInputSchema.parse({ tenantId: tenant.id, ...base })
          await updateTenant.mutateAsync(parsed)
          await invalidateQueries(utils, [
            (u) => u.tenants.list,
            (u) => u.tenants.get,
          ])
          toast.success("Tenant saved")
          onClose()
        }
      } catch (err) {
        if (err instanceof z.ZodError) {
          toast.error(err.issues[0]?.message ?? "Please check the form for errors")
          return
        }
        toast.error(err instanceof Error ? err.message : "Could not save tenant")
      }
    },
  })

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
          name="firstName"
          validators={{
            onChange: createTenantInputSchema.shape.firstName,
            onBlur: createTenantInputSchema.shape.firstName,
          }}
        >
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid || undefined}>
                <FieldLabel htmlFor={field.name}>First name</FieldLabel>
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

        <form.Field
          name="lastName"
          validators={{
            onChange: createTenantInputSchema.shape.lastName,
            onBlur: createTenantInputSchema.shape.lastName,
          }}
        >
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid || undefined}>
                <FieldLabel htmlFor={field.name}>Last name</FieldLabel>
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

        <form.Field
          name="email"
          validators={{
            onChange: createTenantInputSchema.shape.email,
            onBlur: createTenantInputSchema.shape.email,
          }}
        >
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid || undefined}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
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

        <form.Field name="phone">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="tel"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="notes">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Notes</FieldLabel>
              <Textarea
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>

        {mode === "create" ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel htmlFor="assign-unit">Assign to unit</FieldLabel>
              <Switch
                id="assign-unit"
                checked={assignUnit}
                onCheckedChange={(next) => setAssignUnit(Boolean(next))}
              />
            </div>

            {assignUnit ? (
              <>
                <Field>
                  <FieldLabel htmlFor="tenancy-unit">Unit</FieldLabel>
                  <Select value={unitId} onValueChange={setUnitId}>
                    <SelectTrigger id="tenancy-unit" className="w-full">
                      <SelectValue placeholder="Select a unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.label} · {unit.propertyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="tenancy-status">Tenancy status</FieldLabel>
                  <Select
                    value={status}
                    onValueChange={(next) => setStatus(next as "pending" | "active")}
                  >
                    <SelectTrigger id="tenancy-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TENANCY_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="tenancy-start">Start date</FieldLabel>
                  <Input
                    id="tenancy-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </Field>

                <CoTenantPicker
                  value={coTenants}
                  onChange={setCoTenants}
                  allowPrimary={false}
                />
              </>
            ) : null}
          </div>
        ) : null}
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
              {isSubmitting || isPending
                ? "Saving…"
                : mode === "create"
                  ? "Create tenant"
                  : "Save tenant"}
            </Button>
          )}
        </form.Subscribe>
      </SheetFooter>
    </>
  )
}
