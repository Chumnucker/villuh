"use client"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  LinkButton,
} from "@villuh/ui"
import { ROUTES } from "@/app/routes"
import type { PlanLimitResource } from "./plan-limit-gate"

/**
 * Quota-hit UX (D-39/D-40). Controlled dialog — shown either by `PlanLimitGate`
 * intercepting a create trigger, or by a mutation that raced past the gate and
 * came back with `appCode: 'PLAN_LIMIT'` (D-43).
 */
export function LimitReachedDialog({
  open,
  onOpenChange,
  resource,
  action,
  count,
  limit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  resource: PlanLimitResource
  /** e.g. "Adding a property" — the attempted action that got blocked. */
  action: string
  count: number
  limit: number
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>You&apos;ve reached your {resource} limit</DialogTitle>
          <DialogDescription>
            {action} isn&apos;t available on your plan. You&apos;re using{" "}
            {count} of {limit} {resource}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <LinkButton href={ROUTES.billing} onClick={() => onOpenChange(false)}>
            View billing plans
          </LinkButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
