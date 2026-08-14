"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  createSerializer,
  parseAsString,
  useQueryStates,
  type Nullable,
  type UrlKeys,
  type Values,
} from "nuqs"

import { registerQueryStateKeys } from "./key-registry"

/**
 * URL-driven overlays (dialogs / sheets / lightboxes). See README.md for the
 * full design: key scheme, history semantics, and the invariants this module
 * relies on.
 *
 * History semantics: overlays open with `push` and close with `replace`, so
 * browser back closes an open overlay and closing via the UI does not strand
 * a forward entry that re-opens it. Caveat: nuqs merges all updates inside a
 * ~150ms window into ONE history write (push wins) — never fire an overlay
 * open and a table update from the same handler.
 */
const OPEN_OPTIONS = { history: "push", scroll: false } as const
const CLOSE_OPTIONS = { history: "replace", scroll: false } as const

/**
 * Param value written when a flag overlay opens. Flags carry no payload, so
 * the value is never read — "open" just makes the URL self-explanatory
 * (`?property.tags=open`).
 */
const FLAG_OPEN_VALUE = "open"

/** Default create-mode sentinel for entity overlays (`?unit.form=new`). */
const DEFAULT_CREATE_VALUE = "new"

/* ── Handles ───────────────────────────────────────────────────────────── */

type OverlayDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Handle for a payload-free overlay: the param is either absent (closed) or
 * present (open). `open` / `close` / `toggle` are referentially stable across
 * renders; `isOpen` / `dialogProps` / `href` change with the URL.
 */
export type FlagOverlayHandle = {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  /** Spreads directly onto a Radix `Dialog` / `Sheet` / `Popover` root. */
  dialogProps: OverlayDialogProps
  /**
   * Query-only href built from the CURRENT search params, so a link that
   * opens the overlay preserves table state. Cast to `Route` at the call
   * site; `@villuh/ui` deliberately does not import from `next`.
   */
  href: () => string
}

/**
 * Handle for an overlay whose param value is its payload — an entity id, or
 * the def's create sentinel (`"new"` by default) for create mode.
 *
 * Prefer `entityId` / `isCreate` over the raw `value`: they encode the
 * create-vs-edit split once, so consumers never re-derive it.
 * `open` / `close` / `toggle` are referentially stable across renders.
 */
export type EntityOverlayHandle = {
  isOpen: boolean
  /** Raw param value; `null` when closed. */
  value: string | null
  /** The entity id, or `null` when closed or in create mode. */
  entityId: string | null
  /** Open with the create sentinel as the value. */
  isCreate: boolean
  /**
   * The last non-null `value`, retained across the close animation (only reset
   * when the overlay re-opens with a new value). Radix keeps an overlay's
   * content mounted while it animates out, but by then `value`/`entityId` have
   * already gone `null` — so a body that resolves its subject from `entityId`
   * blanks (or flips to create/not-found) mid-close. Resolve the RENDERED
   * subject from these `held*` fields; keep using `isOpen`/`entityId` to gate
   * query `enabled` (so nothing fires while closed).
   */
  heldValue: string | null
  /** {@link heldValue} as an entity id (`null` in create mode / before first open). */
  heldEntityId: string | null
  /** Whether {@link heldValue} is the create sentinel. */
  heldIsCreate: boolean
  /** No argument opens in create mode (writes the def's create sentinel). */
  open: (value?: string) => void
  close: () => void
  toggle: (value?: string) => void
  /** Spreads directly onto a Radix `Dialog` / `Sheet` / `Popover` root. */
  dialogProps: OverlayDialogProps
  /** See {@link FlagOverlayHandle.href}. */
  href: (value?: string) => string
}

/** An overlay component receives its handle as a prop and never imports its own registry. */
export type EntityOverlayComponent = React.ComponentType<{
  overlay: EntityOverlayHandle
}>
export type FlagOverlayComponent = React.ComponentType<{
  overlay: FlagOverlayHandle
}>

/* ── Defs ──────────────────────────────────────────────────────────────── */

export type EntityOverlayDef = {
  kind: "entity"
  /**
   * `global` — `<AppOverlays>` renders the component and passes the handle.
   * `page`   — key is registered only; the page renders the component itself
   *            and pulls its handle via `group.use(name)`. Reserved for
   *            overlays that need something that cannot cross a layout
   *            boundary (e.g. the gallery Lightbox's live `originRef`).
   */
  mount: "global" | "page"
  component?: EntityOverlayComponent
  /** Value `open()` writes when called with no argument. */
  createValue: string
}

export type FlagOverlayDef = {
  kind: "flag"
  mount: "global"
  component: FlagOverlayComponent
}

export type OverlayDef = EntityOverlayDef | FlagOverlayDef

/** Auto-mounted overlay whose param value is an entity id or the create sentinel. */
export function entity(
  component: EntityOverlayComponent,
  options?: { createValue?: string }
): EntityOverlayDef {
  return {
    kind: "entity",
    mount: "global",
    component,
    createValue: options?.createValue ?? DEFAULT_CREATE_VALUE,
  }
}

/** Auto-mounted overlay with no payload — open/closed only (e.g. ManageTagsDialog). */
export function flag(component: FlagOverlayComponent): FlagOverlayDef {
  return { kind: "flag", mount: "global", component }
}

/**
 * Key-only registration: `<AppOverlays>` skips it and the page renders the
 * component itself, pulling its handle via `group.use(name)`. Use only when
 * the overlay needs a dependency that cannot cross a layout boundary.
 */
export function pageEntity(options?: {
  createValue?: string
}): EntityOverlayDef {
  return {
    kind: "entity",
    mount: "page",
    createValue: options?.createValue ?? DEFAULT_CREATE_VALUE,
  }
}

/* ── Group ─────────────────────────────────────────────────────────────── */

/** Def kind → handle type, so `use("tags")` yields a FlagOverlayHandle and `use("archive")` an EntityOverlayHandle. */
export type OverlayHandles<C extends Record<string, OverlayDef>> = {
  [K in keyof C]: C[K]["kind"] extends "flag"
    ? FlagOverlayHandle
    : EntityOverlayHandle
}

export type OverlayGroup<
  C extends Record<string, OverlayDef> = Record<string, OverlayDef>,
> = {
  /** URL namespace; keys resolve to `${namespace}.${name}`. */
  namespace: string
  defs: C
  urlKeys: Readonly<Record<keyof C & string, string>>
  /** All handles plus `closeAll()`, from a single `useQueryStates` call. */
  useGroup: () => OverlayHandles<C> & { closeAll: () => void }
  /** One handle. For `mount: "page"` overlays and for triggers. */
  use: <K extends keyof C & string>(name: K) => OverlayHandles<C>[K]
  /** Renders every `mount: "global"` overlay in the group. Consumed by `<AppOverlays>`. */
  Mount: React.ComponentType
}

/** Minimal structural shape of the base-merging `createSerializer` overload. */
type OverlaySerializer = (
  base: URLSearchParams,
  values: Record<string, string | null>
) => string

/**
 * Builds an overlay href by merging into the CURRENT search params. The
 * `base` parameter is required on purpose: without it, `createSerializer`
 * starts from an empty URLSearchParams and the link silently drops every
 * table filter. `value: null` clears the key. (Pure function so the node-only
 * test project can reach it.)
 */
export function buildOverlayHref(
  serialize: OverlaySerializer,
  searchParams: URLSearchParams,
  name: string,
  value: string | null
): string {
  return serialize(searchParams, { [name]: value })
}

/**
 * Declare a module's overlays once, at module scope.
 *
 * Everything outside the hooks runs ONCE at module evaluation: the parser map
 * and urlKeys are frozen and never rebuilt, which is what keeps nuqs's setter
 * identity stable (see README — a keyMap rebuilt per render re-arms every
 * debounce that depends on the setter).
 */
export function createOverlays<const C extends Record<string, OverlayDef>>(
  namespace: string,
  defs: C
): OverlayGroup<C> {
  const names = Object.keys(defs) as (keyof C & string)[]

  if (process.env.NODE_ENV !== "production" && "closeAll" in defs) {
    throw new Error(
      `[query-state] "closeAll" is a reserved overlay name (group "${namespace}").`
    )
  }

  // Every overlay param is a plain string with NO default (absent = closed),
  // so `undefined` is a stable defaultValue identity and no `eq` is needed.
  const parsers = Object.freeze(
    Object.fromEntries(names.map((name) => [name, parseAsString]))
  ) as Record<keyof C & string, typeof parseAsString>

  const urlKeys = Object.freeze(
    Object.fromEntries(names.map((name) => [name, `${namespace}.${name}`]))
  ) as Readonly<Record<keyof C & string, string>>

  registerQueryStateKeys(namespace, Object.values(urlKeys), "overlay")

  const serialize = createSerializer(parsers, {
    urlKeys: urlKeys as UrlKeys<typeof parsers>,
  })

  const openValueOf = (name: keyof C & string): string => {
    const def = defs[name]
    return def.kind === "flag" ? FLAG_OPEN_VALUE : def.createValue
  }

  // The one place a computed key meets the nuqs setter's mapped type: TS
  // cannot relate `{ [name]: … }` to a type mapped over the generic C, so
  // this helper carries the single blessed assertion.
  type ValuesPatch = Partial<Nullable<Values<typeof parsers>>>
  const patch = (name: keyof C & string, value: string | null): ValuesPatch =>
    ({ [name]: value }) as ValuesPatch

  function useGroup(): OverlayHandles<C> & { closeAll: () => void } {
    const [values, setValues] = useQueryStates(parsers, {
      urlKeys: urlKeys as UrlKeys<typeof parsers>,
      scroll: false,
    })
    const searchParams = useSearchParams()

    // Live mirror so the stable actions below can read the current values
    // without taking a dependency on them.
    const valuesRef = React.useRef(values)
    valuesRef.current = values

    // Last non-null value per overlay, so a closing overlay can keep rendering
    // its subject through the exit animation (see `heldValue` on the handle).
    // Updated during render for non-null values only; a close (value → null)
    // leaves the prior value intact.
    const lastValueRef = React.useRef<Record<string, string>>({})
    for (const name of names) {
      const v = values[name]
      if (v != null) lastValueRef.current[name] = v
    }

    // Referentially stable across renders — depends only on nuqs's own stable
    // setter. This is what lets a memoized column factory or a useCallback
    // close over `open` without rebuilding on every URL change.
    const actions = React.useMemo(() => {
      const out = {} as Record<
        keyof C & string,
        {
          open: (value?: string) => void
          close: () => void
          toggle: (value?: string) => void
        }
      >
      for (const name of names) {
        const open = (value?: string) =>
          void setValues(patch(name, value ?? openValueOf(name)), OPEN_OPTIONS)
        // Idempotent: Radix can fire onOpenChange(false) more than once (e.g.
        // Escape during an exit animation); a second null write is harmless
        // but still schedules a flush, so short-circuit.
        const close = () => {
          if (valuesRef.current[name] === null) return
          void setValues(patch(name, null), CLOSE_OPTIONS)
        }
        out[name] = {
          open,
          close,
          toggle: (value?: string) =>
            valuesRef.current[name] === null ? open(value) : close(),
        }
      }
      return out
    }, [setValues])

    return React.useMemo(() => {
      const handles = {} as Record<
        string,
        FlagOverlayHandle | EntityOverlayHandle
      >
      for (const name of names) {
        const def = defs[name]
        const value = values[name] ?? null
        const isOpen = value !== null
        const { open, close, toggle } = actions[name]
        const dialogProps: OverlayDialogProps = {
          open: isOpen,
          onOpenChange: (next: boolean) => (next ? open() : close()),
        }
        const href = (v?: string) =>
          buildOverlayHref(
            // Structurally compatible: the base-merging overload with the
            // generic value record widened to plain strings.
            serialize as unknown as OverlaySerializer,
            searchParams,
            name,
            v ?? openValueOf(name)
          )

        if (def.kind === "flag") {
          handles[name] = { isOpen, open, close, toggle, dialogProps, href }
        } else {
          const isCreate = isOpen && value === def.createValue
          const heldValue = value ?? lastValueRef.current[name] ?? null
          const heldIsCreate = heldValue === def.createValue
          handles[name] = {
            isOpen,
            value,
            entityId: isCreate ? null : value,
            isCreate,
            heldValue,
            heldEntityId: heldValue === null || heldIsCreate ? null : heldValue,
            heldIsCreate,
            open,
            close,
            toggle,
            dialogProps,
            href,
          }
        }
      }
      return {
        ...handles,
        // One call clears exactly this group's keys, leaving other params alone.
        closeAll: () => void setValues(null, CLOSE_OPTIONS),
      } as OverlayHandles<C> & { closeAll: () => void }
    }, [values, actions, searchParams, setValues])
  }

  function use<K extends keyof C & string>(name: K): OverlayHandles<C>[K] {
    return useGroup()[name]
  }

  /**
   * One component instance per group, so `useGroup()` is a normal top-level
   * hook call. Every mounted overlay runs its hooks on every page it is
   * mounted on, so any query inside one MUST be gated on `overlay.isOpen`.
   * Gate the QUERY, never the JSX — conditionally rendering the overlay
   * unmounts the Radix root before its exit animation can run.
   */
  function Mount() {
    const handles = useGroup()
    return (
      <>
        {names.map((name) => {
          const def = defs[name]
          if (def.mount !== "global" || !def.component) return null
          // `defs[name].kind` determines `handles[name]`'s shape by
          // construction; TS cannot correlate the two across the union.
          if (def.kind === "flag") {
            const Component = def.component
            return (
              <Component
                key={name}
                overlay={handles[name] as FlagOverlayHandle}
              />
            )
          }
          const Component = def.component
          return (
            <Component
              key={name}
              overlay={handles[name] as EntityOverlayHandle}
            />
          )
        })}
      </>
    )
  }
  Mount.displayName = `Overlays(${namespace})`

  return { namespace, defs, urlKeys, useGroup, use, Mount }
}
