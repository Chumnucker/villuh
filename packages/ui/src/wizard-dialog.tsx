"use client"

import * as React from "react"

import { cn } from "../utils"
import {
  Dialog,
  DialogContainer,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "./dialog"

export type WizardStep = { id: string; label: string }
export type WizardMode = "linear" | "free"

type WizardContextValue = {
  steps: WizardStep[]
  mode: WizardMode
  step: string
  stepIndex: number
  isFirst: boolean
  isLast: boolean
  visited: ReadonlySet<string>
  canAdvance: boolean
  next: () => void
  back: () => void
  goTo: (id: string) => void
  isReachable: (id: string) => boolean
}

const WizardContext = React.createContext<WizardContextValue | null>(null)

function useWizardContext(): WizardContextValue {
  const ctx = React.useContext(WizardContext)
  if (!ctx) {
    throw new Error(
      "WizardDialog compound components must be used within <WizardDialog>"
    )
  }
  return ctx
}

/**
 * Public step API for consumers composing the wizard footer / panels.
 */
export function useWizardDialog() {
  const { steps, step, stepIndex, isFirst, isLast, next, back, goTo } =
    useWizardContext()
  return { steps, step, stepIndex, isFirst, isLast, next, back, goTo }
}

type WizardDialogProps = React.ComponentProps<typeof Dialog> & {
  steps: WizardStep[]
  /** `linear` gates forward navigation behind `canAdvance`; `free` allows any step. */
  mode?: WizardMode
  /** When `false`, `next()` and the immediate forward step are blocked (D-34). */
  canAdvance?: boolean
  /** Controlled active step id. Omit for uncontrolled state seeded to `steps[0]`. */
  step?: string
  onStepChange?: (id: string) => void
}

function WizardDialog({
  steps,
  mode = "linear",
  canAdvance = true,
  step: controlledStep,
  onStepChange,
  open,
  onOpenChange,
  children,
  ...props
}: WizardDialogProps) {
  const firstId = steps[0]?.id ?? ""

  const initialVisited = React.useMemo(
    () =>
      mode === "free"
        ? new Set(steps.map((s) => s.id))
        : new Set(firstId ? [firstId] : []),
    [mode, steps, firstId]
  )

  const [uncontrolledStep, setUncontrolledStep] = React.useState(firstId)
  const [visited, setVisited] = React.useState<Set<string>>(initialVisited)

  const isControlled = controlledStep !== undefined
  const activeId = isControlled ? controlledStep : uncontrolledStep

  const foundIndex = steps.findIndex((s) => s.id === activeId)
  const stepIndex = foundIndex < 0 ? 0 : foundIndex

  const setStep = React.useCallback(
    (id: string) => {
      if (!isControlled) setUncontrolledStep(id)
      onStepChange?.(id)
    },
    [isControlled, onStepChange]
  )

  const isReachable = React.useCallback(
    (id: string) => {
      const idx = steps.findIndex((s) => s.id === id)
      if (idx < 0) return false
      if (mode === "free") return true
      if (visited.has(id)) return true
      return idx === stepIndex + 1 && canAdvance
    },
    [steps, mode, visited, stepIndex, canAdvance]
  )

  const next = React.useCallback(() => {
    if (stepIndex >= steps.length - 1) return
    if (!canAdvance) return
    const nextStep = steps[stepIndex + 1]
    if (!nextStep) return
    setVisited((prev) => new Set(prev).add(nextStep.id))
    setStep(nextStep.id)
  }, [stepIndex, steps, canAdvance, setStep])

  const back = React.useCallback(() => {
    if (stepIndex <= 0) return
    const prevStep = steps[stepIndex - 1]
    if (!prevStep) return
    setStep(prevStep.id)
  }, [stepIndex, steps, setStep])

  const goTo = React.useCallback(
    (id: string) => {
      const idx = steps.findIndex((s) => s.id === id)
      if (idx < 0) return
      if (!isReachable(id)) return
      setVisited((prev) => new Set(prev).add(id))
      setStep(id)
    },
    [steps, isReachable, setStep]
  )

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        if (!isControlled) setUncontrolledStep(firstId)
        setVisited(new Set(initialVisited))
      }
      onOpenChange?.(nextOpen)
    },
    [isControlled, firstId, initialVisited, onOpenChange]
  )

  const value = React.useMemo<WizardContextValue>(
    () => ({
      steps,
      mode,
      step: activeId,
      stepIndex,
      isFirst: stepIndex === 0,
      isLast: stepIndex === steps.length - 1,
      visited,
      canAdvance,
      next,
      back,
      goTo,
      isReachable,
    }),
    [
      steps,
      mode,
      activeId,
      stepIndex,
      visited,
      canAdvance,
      next,
      back,
      goTo,
      isReachable,
    ]
  )

  return (
    <WizardContext.Provider value={value}>
      <Dialog open={open} onOpenChange={handleOpenChange} {...props}>
        {children}
      </Dialog>
    </WizardContext.Provider>
  )
}

/**
 * `DialogContainer` widened into a two-column shell. `cn()` is `twMerge`, so
 * `sm:max-w-4xl` overrides the inherited `sm:max-w-md` while the unprefixed
 * `max-w-[calc(100%-2rem)]` survives, and `flex-col sm:flex-row` stacks on
 * mobile / splits above `sm` (D-31/D-32). Rounding, border, shadow, animation
 * and the top-right close button are all inherited unchanged.
 */
function WizardDialogContainer({
  className,
  ...props
}: React.ComponentProps<typeof DialogContainer>) {
  return (
    <DialogContainer
      data-slot="wizard-dialog-container"
      className={cn(
        "max-h-[85vh] sm:max-w-4xl flex-col sm:flex-row",
        className
      )}
      {...props}
    />
  )
}

/**
 * `DialogHeader` rotated 90°: byte-identical `gap-2.5` / `px-4 py-4` /
 * `bg-secondary`, a `border-b` that becomes `sm:border-r sm:border-b-0`, and a
 * fixed `sm:w-64` column above `sm`. `pr-12` clears the container's close button
 * on mobile. Renders the compact `Step n of m · label` line below `sm` (D-32).
 */
function WizardDialogSidebar({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { steps, stepIndex } = useWizardContext()
  const current = steps[stepIndex]
  return (
    <div
      data-slot="wizard-dialog-sidebar"
      className={cn(
        "flex shrink-0 flex-col gap-2.5 border-b bg-secondary px-4 py-4 pr-12 sm:w-64 sm:border-r sm:border-b-0 sm:pr-4",
        className
      )}
      {...props}
    >
      {children}
      <p className="text-sm text-muted-foreground sm:hidden">
        {`Step ${stepIndex + 1} of ${steps.length} · ${current?.label ?? ""}`}
      </p>
    </div>
  )
}

function WizardDialogTitle(props: React.ComponentProps<typeof DialogTitle>) {
  return <DialogTitle {...props} />
}

/** `DialogDescription`, hidden below `sm` where the sidebar is a compact top bar (D-32). */
function WizardDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  return (
    <DialogDescription
      className={cn("hidden sm:block", className)}
      {...props}
    />
  )
}

/**
 * The single scrolling column. An explicit `min-h-80` both floors the height so
 * short steps do not collapse and defeats the `flex-1` `min-height: auto` that
 * would otherwise stop `overflow-y-auto` from scrolling — so no zero min-height
 * override is needed or allowed here (D-35, UI-SPEC §1.4).
 */
function WizardDialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="wizard-dialog-body"
      className={cn(
        "min-h-80 flex-1 overflow-y-auto px-6 pt-6 pb-6 sm:pt-12",
        className
      )}
      {...props}
    />
  )
}

/**
 * One panel per step, always mounted, toggled via the `hidden` attribute so a
 * single form instance spans the wizard (D-35). The root carries no `display`
 * utility (it would override `hidden`); put layout classes on a child wrapper.
 * Focus moves here on step change, skipped on initial mount.
 */
function WizardDialogPanel({
  step: panelStep,
  className,
  ...props
}: React.ComponentProps<"div"> & { step: string }) {
  const { step: activeId } = useWizardContext()
  const isActive = panelStep === activeId
  const ref = React.useRef<HTMLDivElement>(null)
  const isInitialMount = React.useRef(true)

  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (isActive) ref.current?.focus()
  }, [isActive])

  return (
    <div
      ref={ref}
      data-slot="wizard-dialog-panel"
      hidden={!isActive}
      tabIndex={-1}
      className={cn(className)}
      {...props}
    />
  )
}

/** `DialogFooter`'s exact class string, scoped to the wizard's right column. */
function WizardDialogFooter(props: React.ComponentProps<typeof DialogFooter>) {
  return <DialogFooter {...props} />
}

export {
  WizardDialog,
  WizardDialogBody,
  WizardDialogContainer,
  WizardDialogDescription,
  WizardDialogFooter,
  WizardDialogPanel,
  WizardDialogSidebar,
  WizardDialogTitle,
}
