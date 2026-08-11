"use client"

import {
  cloneElement,
  isValidElement,
  useState,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react"
import { useUser } from "@/modules/app/providers/me-provider"
import { LimitReachedDialog } from "./limit-reached-dialog"

/** D-42: extensible — properties (Phase 3) + units (Phase 3); members already gated elsewhere. */
export type PlanLimitResource = "properties" | "units"

const RESOURCE_NOUN: Record<PlanLimitResource, string> = {
  properties: "property",
  units: "unit",
}

function defaultAction(resource: PlanLimitResource) {
  return `Adding a ${RESOURCE_NOUN[resource]}`
}

/**
 * Wraps a create trigger (`Add property` / `Add unit`). Reads quota from the
 * `me.get` cache (D-41) — never raw counts from the caller. At/over limit,
 * intercepts the click and opens `LimitReachedDialog` instead of letting the
 * trigger navigate/open its create flow (D-39). Under limit, renders the
 * trigger unchanged.
 */
export function PlanLimitGate({
  resource,
  action,
  children,
}: {
  resource: PlanLimitResource
  /** Copy for the dialog body, e.g. "Adding a property". Defaults from resource. */
  action?: string
  children: ReactElement<{ onClick?: (e: MouseEvent) => void }>
}) {
  const { user: me } = useUser()
  const [open, setOpen] = useState(false)

  const quota = me.org.quota[resource]
  const atLimit = quota.limit !== -1 && quota.count >= quota.limit

  const trigger: ReactNode = isValidElement(children)
    ? atLimit
      ? cloneElement(children, {
          onClick: (e: MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            setOpen(true)
          },
        })
      : children
    : children

  return (
    <>
      {trigger}
      <LimitReachedDialog
        open={open}
        onOpenChange={setOpen}
        resource={resource}
        action={action ?? defaultAction(resource)}
        count={quota.count}
        limit={quota.limit}
      />
    </>
  )
}

type PlanLimitErrorShape = {
  data?: {
    appCode?: string
    meta?: { resource?: string; limit?: number; current?: number }
  }
}

/** D-43 backstop: server still enforces PLAN_LIMIT even if the UI gate raced. */
export function isPlanLimitError(
  error: unknown
): error is PlanLimitErrorShape & { data: { appCode: "PLAN_LIMIT" } } {
  return (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    (error as PlanLimitErrorShape).data?.appCode === "PLAN_LIMIT"
  )
}

/** Extracts `{ resource, limit, current }` from a raced PLAN_LIMIT mutation error, if present. */
export function getPlanLimitMeta(error: unknown) {
  if (!isPlanLimitError(error)) return null
  const meta = error.data.meta
  if (!meta?.resource || meta.limit === undefined || meta.current === undefined) {
    return null
  }
  return {
    resource: meta.resource as PlanLimitResource,
    limit: meta.limit,
    current: meta.current,
  }
}
