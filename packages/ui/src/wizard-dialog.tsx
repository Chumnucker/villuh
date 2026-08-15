"use client"

import * as React from "react"

import { cn } from "../utils"
import { Button } from "./button"
import {
  Dialog,
  DialogContainer,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "./dialog"
import { PlatformIcon } from "./icon"

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
        "flex shrink-0 flex-col gap-2.5 border-b bg-secondary p-6 pr-12 sm:w-64 sm:border-r sm:border-b-0",
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
  return <DialogTitle {...props} className={cn("font-semibold", props.className)} />
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
        "min-h-80 flex-1 overflow-y-auto px-6 pt-6 pb-6 sm:pt-12 outline-none",
        className
      )}
      {...props}
    />
  )
}

/**
 * One panel per step. A panel's children are lazily mounted on first visit and
 * then kept mounted (toggled via the `hidden` attribute) for the rest of the
 * open session, so a single form instance still spans the wizard (D-35) — a
 * field, once mounted, never unmounts, and values live in the external form
 * store regardless. Deferring the mount keeps opening the wizard cheap: heavy
 * later steps (e.g. a dnd-kit gallery) don't spin up until the user navigates
 * to them, instead of all landing on the single "open" frame. `visited` only
 * grows within an open session (it resets on close), so this never re-hides a
 * step the user has already reached.
 *
 * The root carries no `display` utility (it would override `hidden`); put layout
 * classes on a child wrapper. Focus moves here on step change, skipped on
 * initial mount.
 */
function WizardDialogPanel({
  step: panelStep,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { step: string }) {
  const { step: activeId, visited } = useWizardContext()
  const isActive = panelStep === activeId
  const shouldRender = isActive || visited.has(panelStep)
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
      className={cn("outline-none focus-visible:outline-none", className)}
      {...props}
    >
      {shouldRender ? children : null}
    </div>
  )
}

/** `DialogFooter`'s exact class string, scoped to the wizard's right column. */
function WizardDialogFooter(props: React.ComponentProps<typeof DialogFooter>) {
  return <DialogFooter {...props} className={cn("bg-transparent border-t-0 py-4", props.className)} />
}

/**
 * The wizard's right column: a `<form>` that owns the consumer's submit. This is
 * generic wizard plumbing (not feature-specific), so it lives with the primitive.
 *
 * `enterAdvances` implements the "Enter must not submit" contract for linear
 * flows — pressing Enter advances to the next step instead of submitting, until
 * the last step. Free flows (no `enterAdvances`) submit on Enter. `onSubmit` is
 * only invoked when the wizard is actually meant to submit.
 */
function WizardDialogForm({
  onSubmit,
  enterAdvances = false,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"form">, "onSubmit"> & {
  onSubmit: () => void
  enterAdvances?: boolean
}) {
  const { isLast, next } = useWizardContext()
  return (
    <form
      data-slot="wizard-dialog-form"
      className={cn("flex min-w-0 flex-1 flex-col outline-none", className)}
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (enterAdvances && !isLast) {
          next()
          return
        }
        onSubmit()
      }}
      {...props}
    >
      {children}
    </form>
  )
}

/**
 * Standard linear-wizard footer: a `Back` button (hidden on the first step) and,
 * on the right, either `Next` (gated by `canAdvance`) or — on the last step — the
 * consumer-supplied `submit` node. Consumers only own the terminal submit control
 * (label + pending/error state); Back/Next navigation is handled here so every
 * wizard doesn't re-derive `isFirst`/`isLast`/`canAdvance`.
 */
function WizardDialogFooterNav({
  submit,
  className,
  ...props
}: React.ComponentProps<typeof DialogFooter> & { submit: React.ReactNode }) {
  const { isFirst, isLast, canAdvance, back, next } = useWizardContext()
  return (
    <WizardDialogFooter className={className} {...props}>
      {!isFirst ? (
        <Button type="button" variant="outline" onClick={back}>
          <PlatformIcon icon="IconChevronLeft" size={16} data-icon="inline-start" />
          Back
        </Button>
      ) : null}
      {isLast ? (
        submit
      ) : (
        <Button type="button" onClick={next} disabled={!canAdvance}>
          Next
          <PlatformIcon icon="IconChevronRight" size={16} data-icon="inline-end" />
        </Button>
      )}
    </WizardDialogFooter>
  )
}

/**
 * Vertical stepper, built from `PlatformIcon` + Tailwind only — no new
 * dependency and no new `PLATFORM_ICONS` key (D-36). Renders the five states of
 * UI-SPEC §1.3 with an `sr-only` state word so color is never the only signal.
 * Hidden below `sm`, where the compact sidebar line carries the count (D-32).
 */
function WizardDialogSteps({
  className,
  ...props
}: React.ComponentProps<"nav">) {
  const { steps, step: activeId, visited, isReachable, goTo } =
    useWizardContext()

  return (
    <nav
      aria-label="Wizard steps"
      data-slot="wizard-dialog-steps"
      className={cn("mt-4 hidden sm:block", className)}
      {...props}
    >
      <ol className="flex flex-col">
        {steps.map((s, index) => {
          const isCurrent = s.id === activeId
          const isCompleted = visited.has(s.id) && !isCurrent
          const reachable = isReachable(s.id)
          const isLastStep = index === steps.length - 1

          const stateWord = isCompleted
            ? "Completed"
            : isCurrent
              ? "Current step"
              : "Not started"

          return (
            <li key={s.id} className="relative pb-6 last:pb-0">
              {!isLastStep && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-3 top-6 h-6 w-px -translate-x-1/2",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => goTo(s.id)}
                aria-current={isCurrent ? "step" : undefined}
                disabled={!reachable}
                className="group flex w-full items-center gap-3 rounded-lg text-left focus-visible:ring-1 focus-visible:ring-ring/35 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full",
                    isCompleted &&
                      "border border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-2 border-primary bg-background",
                    !isCompleted &&
                      !isCurrent &&
                      "border border-border bg-background"
                  )}
                >
                  {isCompleted ? (
                    <PlatformIcon
                      icon="IconCheckmark1"
                      size={12}
                      strokeWidth={3}
                    />
                  ) : isCurrent ? (
                    <span className="size-2 rounded-full bg-primary" />
                  ) : (
                    <span className="size-2 rounded-full bg-muted-foreground/40" />
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    isCompleted && "text-foreground",
                    isCurrent && "font-medium text-foreground",
                    !isCompleted &&
                      !isCurrent &&
                      "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {s.label}
                </span>
                <span className="sr-only">{stateWord}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export {
  WizardDialog,
  WizardDialogBody,
  WizardDialogContainer,
  WizardDialogDescription,
  WizardDialogFooter,
  WizardDialogFooterNav,
  WizardDialogForm,
  WizardDialogPanel,
  WizardDialogSidebar,
  WizardDialogSteps,
  WizardDialogTitle,
}
