"use client"

import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"
import { z } from "zod"
import {
  Button,
  Dialog,
  DialogContainer,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldError,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  PlatformIcon,
  ScrollArea,
  cn,
  isPlatformIconName,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import {
  createAmenityInputSchema,
  zAmenityIconKey,
  zTagColorKey,
} from "@villuh/server/schemas/amenities"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@villuh/server/router"
import { useUser } from "@/modules/app/providers/me-provider"
import {
  AMENITY_ICON_COLOR_CLASSES,
  AMENITY_ICON_KEYS,
  TAG_COLOR_KEYS,
  type AmenityIconKey,
  type TagColorKey,
} from "../lib/amenity-icons"
import { AmenityIconColorPicker } from "./amenity-icon-color-picker"

type RouterOutput = inferRouterOutputs<AppRouter>
type CatalogRow =
  RouterOutput["amenities"]["catalog"]["list"]["amenities"][number]

/** Which side of the catalog a dialog targets. The server filters the catalog
 * to `scope IN (scope, 'both')` and new amenities are created with this scope. */
export type AmenityScope = "property" | "unit"

// The inline "create a new amenity" form — name reuses the catalog schema's own
// rule; icon/color are constrained to the shared palettes.
const createAmenityFormSchema = z.object({
  name: createAmenityInputSchema.shape.name,
  iconKey: zAmenityIconKey,
  colorKey: zTagColorKey,
})

export type AmenitiesSelectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Scopes the (server-side) catalog filter + inline creation. */
  scope: AmenityScope
  /** Catalog ids to pre-select when the dialog opens (baseline). */
  initialSelectedIds?: readonly string[]
  submitLabel: string
  submitVariant?: "default" | "destructive"
  /** Show the inline "create a new amenity" row. Off for remove-style dialogs. */
  allowCreate?: boolean
  emptyLabel?: string
  /**
   * Called with the FINAL selected catalog ids on submit. The caller owns the
   * mutation semantics (diff for a single property, bulkAdd/bulkRemove for a
   * unit selection) plus its own toast + invalidation. Resolve to close the
   * dialog; throw to keep it open.
   */
  onSubmit: (selectedIds: string[]) => Promise<void>
}

/**
 * Shared amenity multi-select dialog (D-39). One component behind the property
 * "Add amenities" card action AND the units-table bulk add/remove toolbar, so
 * the picker UX + inline catalog creation live in exactly one place.
 *
 * The form is a child of `DialogContainer` (Radix `Content`), which is
 * presence-gated: it mounts on open, stays through the close animation, then
 * unmounts — so selection state is fresh per open WITHOUT gating the JSX on
 * `open`, and never blanks to a bare header mid-close.
 */
export function AmenitiesSelectDialog({
  open,
  onOpenChange,
  ...formProps
}: AmenitiesSelectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContainer className="sm:max-w-lg">
        <AmenitiesSelectForm
          {...formProps}
          onClose={() => onOpenChange(false)}
        />
      </DialogContainer>
    </Dialog>
  )
}

function AmenitiesSelectForm({
  title,
  description,
  scope,
  initialSelectedIds,
  submitLabel,
  submitVariant = "default",
  allowCreate = true,
  emptyLabel,
  onSubmit,
  onClose,
}: Omit<AmenitiesSelectDialogProps, "open" | "onOpenChange"> & {
  onClose: () => void
}) {
  const { user } = useUser()
  const canWrite = user.org.permissions.write
  const canCreate = allowCreate && canWrite
  const utils = trpc.useUtils()

  // The server returns only rows attachable to this scope — no client filtering.
  const catalogQuery = trpc.amenities.catalog.list.useQuery({
    attachableTo: scope,
  })
  const catalog: CatalogRow[] = catalogQuery.data?.amenities ?? []

  // `null` = untouched, so selection derives from `initialSelectedIds` (which
  // can arrive late while a query loads). The first toggle/create snapshots that
  // baseline into a mutable set — no seeding effect needed.
  const [override, setOverride] = useState<Set<string> | null>(null)
  const selected = override ?? new Set(initialSelectedIds ?? [])

  const createAmenity = trpc.amenities.catalog.create.useMutation({
    onError: (err) => toast.error(err.message || "Could not create amenity"),
  })

  const createForm = useForm({
    defaultValues: {
      name: "",
      iconKey: AMENITY_ICON_KEYS[0] as AmenityIconKey,
      colorKey: TAG_COLOR_KEYS[0] as TagColorKey,
    },
    validators: { onSubmit: createAmenityFormSchema },
    onSubmit: async ({ value }) => {
      const { amenity } = await createAmenity.mutateAsync({
        name: value.name,
        scope,
        iconKey: value.iconKey,
        colorKey: value.colorKey,
      })
      await invalidateQueries(utils, [(u) => u.amenities.catalog.list])
      setOverride((prev) => {
        const next = new Set(prev ?? initialSelectedIds ?? [])
        next.add(amenity.id)
        return next
      })
      createForm.reset()
    },
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  function toggle(catalogId: string) {
    setOverride((prev) => {
      const next = new Set(prev ?? initialSelectedIds ?? [])
      if (next.has(catalogId)) next.delete(catalogId)
      else next.add(catalogId)
      return next
    })
  }

  async function handleSubmit() {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit([...selected])
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = catalogQuery.isLoading

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}
      </DialogHeader>

      <DialogContent>
        {canCreate ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void createForm.handleSubmit()
            }}
          >
            <createForm.Field
              name="name"
              validators={{
                onChange: ({ value }) => {
                  const parsed =
                    createAmenityFormSchema.shape.name.safeParse(value)
                  return parsed.success
                    ? undefined
                    : parsed.error.issues[0]?.message
                },
              }}
            >
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid || undefined}>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <createForm.Subscribe
                          selector={(state) =>
                            [
                              state.values.iconKey,
                              state.values.colorKey,
                            ] as const
                          }
                        >
                          {([iconKey, colorKey]) => (
                            <AmenityIconColorPicker
                              size="sm"
                              iconKey={iconKey}
                              colorKey={colorKey}
                              onChange={(next) => {
                                createForm.setFieldValue("iconKey", next.iconKey)
                                createForm.setFieldValue(
                                  "colorKey",
                                  next.colorKey
                                )
                              }}
                            />
                          )}
                        </createForm.Subscribe>
                      </InputGroupAddon>
                      <InputGroupInput
                        id={field.name}
                        name={field.name}
                        placeholder="Create a new amenity"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid || undefined}
                      />
                      <InputGroupAddon align="inline-end">
                        <createForm.Subscribe
                          selector={(state) =>
                            [
                              state.canSubmit,
                              state.isSubmitting,
                              state.values.name,
                            ] as const
                          }
                        >
                          {([canSubmit, isCreating, name]) => (
                            <InputGroupButton
                              type="submit"
                              size="sm"
                              disabled={
                                !canSubmit ||
                                isCreating ||
                                createAmenity.isPending ||
                                !name.trim()
                              }
                            >
                              Create
                            </InputGroupButton>
                          )}
                        </createForm.Subscribe>
                      </InputGroupAddon>
                    </InputGroup>
                    {isInvalid ? (
                      <FieldError
                        errors={field.state.meta.errors.map((err) =>
                          typeof err === "string"
                            ? { message: err }
                            : { message: err?.message }
                        )}
                      />
                    ) : null}
                  </Field>
                )
              }}
            </createForm.Field>
          </form>
        ) : null}

        <ScrollArea className="max-h-96 rounded-3xl bg-input">
          <div className="flex flex-col gap-1 p-2.5">
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-2xl bg-muted"
                  />
                ))}
              </div>
            ) : catalog.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {emptyLabel ??
                  (canCreate
                    ? "No amenities yet. Create one above to get started."
                    : "No amenities in the catalog yet.")}
              </p>
            ) : (
              catalog.map((row) => {
                const isSelected = selected.has(row.id)
                return (
                  <button
                    key={row.id}
                    type="button"
                    disabled={!canWrite}
                    onClick={() => toggle(row.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors",
                      "hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent",
                      isSelected && "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-xl bg-card",
                        AMENITY_ICON_COLOR_CLASSES[row.colorKey as TagColorKey]
                      )}
                    >
                      <PlatformIcon
                        icon={
                          isPlatformIconName(row.iconKey)
                            ? row.iconKey
                            : "IconStar"
                        }
                        size={16}
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {row.name}
                    </span>
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      <PlatformIcon
                        icon={isSelected ? "IconCheckmark1" : "IconPlusSmall"}
                        size={14}
                      />
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        {canWrite ? (
          <Button
            variant={submitVariant}
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : submitLabel}
          </Button>
        ) : null}
      </DialogFooter>
    </>
  )
}
