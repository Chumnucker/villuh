"use client"

import * as React from "react"
import { toast } from "sonner"
import { z } from "zod"
import {
  Button,
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  Field,
  FieldLabel,
  Input,
  PlatformIcon,
} from "@villuh/ui"
import { trpc } from "@villuh/api"
import { createTenantInputSchema } from "@villuh/server/schemas/tenants"

/**
 * The value contract shared with any tenancy write. `memberTenantIds` is the
 * full member set (order-insignificant); `primaryTenantId` is the single member
 * the caller should send as `createTenancy.primaryTenantId`. It is always one of
 * `memberTenantIds`, or `null` when the set is empty (or when the primary is
 * chosen elsewhere — see `allowPrimary`).
 */
export type CoTenantSelection = {
  memberTenantIds: string[]
  primaryTenantId: string | null
}

type TenantOption = { value: string; label: string }

/**
 * Combobox over `tenants.list` that builds a tenancy member set from EXISTING
 * tenant records, plus an inline "create new tenant" affordance so a landlord
 * never re-keys a person who is already in the system (decision #10 — no
 * duplicate persons). Fully controlled: it owns no selection state, only the
 * transient add-combobox input and the inline create form.
 */
export function CoTenantPicker({
  value,
  onChange,
  excludeTenantIds = [],
  allowPrimary = true,
  disabled = false,
}: {
  value: CoTenantSelection
  onChange: (next: CoTenantSelection) => void
  /**
   * Tenant ids that must never appear as selectable members (e.g. the primary
   * tenant being created in the parent form, who is added to the member set by
   * the caller after creation).
   */
  excludeTenantIds?: string[]
  /**
   * When false, hides the "make primary" control and never sets
   * `primaryTenantId` — used when the caller decides the primary itself.
   */
  allowPrimary?: boolean
  disabled?: boolean
}) {
  const [inputValue, setInputValue] = React.useState("")
  const [showCreate, setShowCreate] = React.useState(false)
  const [draft, setDraft] = React.useState({ firstName: "", lastName: "", email: "" })

  const utils = trpc.useUtils()
  const { data: tenantsData } = trpc.tenants.list.useQuery()
  const tenants = tenantsData?.tenants ?? []

  const createTenant = trpc.tenants.create.useMutation()

  const labelOf = React.useCallback(
    (id: string) => {
      const t = tenants.find((row) => row.id === id)
      return t ? `${t.firstName} ${t.lastName}` : id
    },
    [tenants]
  )

  const excluded = new Set([...excludeTenantIds, ...value.memberTenantIds])
  const options: TenantOption[] = tenants
    .filter((t) => !excluded.has(t.id))
    .map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }))

  function addMember(id: string) {
    if (value.memberTenantIds.includes(id)) return
    const memberTenantIds = [...value.memberTenantIds, id]
    const primaryTenantId =
      allowPrimary && value.primaryTenantId === null ? id : value.primaryTenantId
    onChange({ memberTenantIds, primaryTenantId })
  }

  function removeMember(id: string) {
    const memberTenantIds = value.memberTenantIds.filter((m) => m !== id)
    const primaryTenantId =
      value.primaryTenantId === id
        ? (memberTenantIds[0] ?? null)
        : value.primaryTenantId
    onChange({ memberTenantIds, primaryTenantId })
  }

  function makePrimary(id: string) {
    if (!allowPrimary) return
    onChange({ memberTenantIds: value.memberTenantIds, primaryTenantId: id })
  }

  async function submitCreate() {
    try {
      const parsed = createTenantInputSchema.parse({
        firstName: draft.firstName,
        lastName: draft.lastName,
        email: draft.email,
      })
      const { tenant } = await createTenant.mutateAsync(parsed)
      await utils.tenants.list.invalidate()
      addMember(tenant.id)
      setDraft({ firstName: "", lastName: "", email: "" })
      setShowCreate(false)
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.issues[0]?.message ?? "Please check the tenant details")
        return
      }
      toast.error(err instanceof Error ? err.message : "Could not create tenant")
    }
  }

  return (
    <Field>
      <FieldLabel>Co-tenants</FieldLabel>

      {value.memberTenantIds.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {value.memberTenantIds.map((id) => {
            const isPrimary = value.primaryTenantId === id
            return (
              <li
                key={id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-input/40 px-3 py-2 text-sm"
              >
                <span className="truncate">{labelOf(id)}</span>
                <div className="flex items-center gap-1">
                  {allowPrimary ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={isPrimary ? "default" : "ghost"}
                      disabled={disabled}
                      onClick={() => makePrimary(id)}
                    >
                      {isPrimary ? "Primary" : "Make primary"}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Remove co-tenant"
                    disabled={disabled}
                    onClick={() => removeMember(id)}
                  >
                    <PlatformIcon icon="IconCrossLarge" size={16} />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      <Combobox<TenantOption>
        items={options}
        value={null}
        inputValue={inputValue}
        onInputValueChange={(next) => setInputValue(next)}
        onValueChange={(item) => {
          if (item) {
            addMember(item.value)
            setInputValue("")
          }
        }}
        disabled={disabled}
      >
        <ComboboxInput placeholder="Add an existing tenant…" showClear={false} />
        <ComboboxContent>
          <ComboboxEmpty>No matching tenants</ComboboxEmpty>
          <ComboboxList>
            {(item: TenantOption) => (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      {showCreate ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-border p-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="First name"
              value={draft.firstName}
              disabled={disabled}
              onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
            />
            <Input
              placeholder="Last name"
              value={draft.lastName}
              disabled={disabled}
              onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
            />
          </div>
          <Input
            type="email"
            placeholder="Email"
            value={draft.email}
            disabled={disabled}
            onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={disabled || createTenant.isPending}
              onClick={() => void submitCreate()}
            >
              {createTenant.isPending ? "Adding…" : "Add tenant"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => setShowCreate(true)}
        >
          <PlatformIcon icon="IconPlusSmall" size={16} data-icon="inline-start" />
          Create new tenant
        </Button>
      )}
    </Field>
  )
}
