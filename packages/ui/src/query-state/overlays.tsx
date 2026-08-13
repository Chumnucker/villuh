"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  createSerializer,
  parseAsString,
  useQueryStates,
  type UrlKeys,
} from "nuqs"

import { registerQueryStateKeys } from "./key-registry"
import type {
  OverlayComponent,
  OverlayDef,
  OverlayGroup,
  OverlayHandle,
  OverlayHandles,
} from "./types"

/**
 * D-12: overlays open with `push` and close with `replace`. Browser back closes
 * an open overlay; closing via the UI does not strand a forward entry that
 * re-opens it. Both use `scroll: false` and nuqs's default shallow mode.
 *
 * D-42: nuqs's throttle queue merges every update in a ~150 ms window into one
 * history write and applies `push` if ANY contributor asked for it. An overlay
 * open coalesced with a table filter change therefore produces one `push` entry
 * capturing both — acceptable, and arguably exactly the shareable-link goal, but
 * it means D-12 and D-26 are not independently guaranteed. Do not fire an
 * overlay open and a table update from the same handler.
 */
const OPEN_OPTIONS = { history: "push", scroll: false } as const
const CLOSE_OPTIONS = { history: "replace", scroll: false } as const

/** Auto-mounted overlay whose param value is an entity id (D-31, first form). */
export function entity(
  component: OverlayComponent,
  options?: { defaultValue?: string }
): OverlayDef {
  return { component, mount: "global", defaultValue: options?.defaultValue }
}

/** Auto-mounted overlay with no payload — open/closed only (e.g. ManageTagsDialog). */
export function flag(component: OverlayComponent): OverlayDef {
  return { component, mount: "global", defaultValue: "1" }
}

/**
 * Key-only registration (D-31 second form, D-47). `<AppOverlays>` skips it; the
 * page renders the component itself and pulls its handle via `group.use(name)`.
 * Use this only when the overlay needs something that cannot cross a layout
 * boundary — today that is exactly one case, the gallery Lightbox's live
 * `originRef` handle to the clicked thumbnail (D-32). A second use is a signal
 * to revisit D-08.
 */
export function pageEntity(options?: { defaultValue?: string }): OverlayDef {
  return { mount: "page", defaultValue: options?.defaultValue }
}

/** Minimal structural shape of the base-merging `createSerializer` overload. */
type OverlaySerializer = (
  base: URLSearchParams,
  values: Record<string, string | null>
) => string

/**
 * The D-10 `href` serializer call, extracted as a pure function.
 *
 * Two reasons this is not inlined in `useGroup`:
 *   1. Testability. As a closure inside a hook it is unreachable from the
 *      node-only vitest project (D-46), and every migrated trigger in this
 *      phase calls `open()` rather than `href()` — so the one behaviour D-10
 *      exists for would ship with no test of its own code path at all.
 *   2. `base` is not optional. Passing `searchParams` is the entire point: with
 *      no base, `createSerializer` starts from an empty URLSearchParams and the
 *      link silently drops every table filter (RESEARCH 1.6, Pitfall 5). A
 *      named function with a required `base` parameter makes that unforgettable.
 *
 * `value: null` clears the key rather than setting it.
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
 * Declare a module's overlays once (D-07).
 *
 * Everything outside `useGroup` runs ONCE at module evaluation. The parser map
 * and urlKeys object are frozen and never rebuilt — requirement 2 of D-41.
 */
export function createOverlays<const C extends Record<string, OverlayDef>>(
  namespace: string,
  defs: C
): OverlayGroup<C> {
  const names = Object.keys(defs) as (keyof C & string)[]

  // Every overlay param is a plain string with NO default, so `undefined` is a
  // stable defaultValue identity and no `eq` is needed. Absent = closed (D-05).
  const parsers = Object.freeze(
    Object.fromEntries(names.map((name) => [name, parseAsString]))
  ) as Record<keyof C & string, typeof parseAsString>

  // D-13: `{namespace}.{name}`. A dot in a URL key is legal and is never parsed
  // as a path. D-29: overlay keys are ALWAYS dot-namespaced.
  const urlKeys = Object.freeze(
    Object.fromEntries(names.map((name) => [name, `${namespace}.${name}`]))
  ) as Readonly<Record<keyof C & string, string>>

  registerQueryStateKeys(namespace, Object.values(urlKeys), "overlay")

  const serialize = createSerializer(parsers, {
    urlKeys: urlKeys as UrlKeys<typeof parsers>,
  })
  const defaultOf = (name: keyof C & string) => defs[name]!.defaultValue ?? "new"

  function useGroup() {
    const [values, setValues] = useQueryStates(parsers, {
      urlKeys: urlKeys as UrlKeys<typeof parsers>,
      scroll: false,
    })
    const searchParams = useSearchParams()

    // Mirror the live values so the stable actions below can read them without
    // taking a dependency on them. Same pattern as data-table-toolbar.tsx:44-45.
    const valuesRef = React.useRef(values)
    valuesRef.current = values

    // Stable across renders — depends only on nuqs's own stable setter. This is
    // what lets a memoized column factory or a useCallback close over `open`
    // without rebuilding on every URL change.
    const actions = React.useMemo(() => {
      const out: Record<
        string,
        Pick<OverlayHandle, "open" | "close" | "toggle">
      > = {}
      for (const name of names) {
        const open = (value?: string) =>
          void setValues(
            { [name]: value ?? defaultOf(name) } as never,
            OPEN_OPTIONS
          )
        // Idempotent: Radix can fire onOpenChange(false) more than once (e.g.
        // Escape during an exit animation). Setting null twice is harmless but
        // still schedules a flush, so short-circuit (RESEARCH 7.3).
        const close = () => {
          if (valuesRef.current[name] === null) return
          void setValues({ [name]: null } as never, CLOSE_OPTIONS)
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
      const handles: Record<string, OverlayHandle> = {}
      for (const name of names) {
        const value = values[name] ?? null
        const isOpen = value !== null
        const { open, close, toggle } = actions[name]!
        handles[name] = {
          isOpen,
          value,
          open,
          close,
          toggle,
          dialogProps: {
            open: isOpen,
            onOpenChange: (next: boolean) => (next ? open() : close()),
          },
          // Base = the CURRENT search params. Without the base, createSerializer
          // starts from an empty URLSearchParams and the link drops every table
          // filter (RESEARCH 1.6, Pitfall 5). Returns a query-only string; cast
          // to `Route` at the call site — @villuh/ui does not import next's types.
          // The serializer call itself lives in `buildOverlayHref` so it is
          // reachable from the node-only test project (D-46).
          href: (v?: string) =>
            buildOverlayHref(
              serialize as unknown as OverlaySerializer,
              searchParams,
              name,
              v ?? defaultOf(name)
            ),
        }
      }
      return {
        ...handles,
        // One call clears exactly this group's keys and leaves other params alone.
        closeAll: () => void setValues(null, CLOSE_OPTIONS),
      } as OverlayHandles<C> & { closeAll: () => void }
    }, [values, actions, searchParams, setValues])
  }

  function use<K extends keyof C & string>(name: K): OverlayHandle {
    return useGroup()[name]
  }

  return { namespace, defs, urlKeys, useGroup, use }
}
