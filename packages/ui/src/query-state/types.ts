import type * as React from "react"

import type {
  Filter,
  FilterFieldConfig,
  FilterOperator,
  FilterServerMapping,
} from "../filters"
import type { PlatformIconName } from "../icon"

/* ── Overlays ──────────────────────────────────────────────────────────── */

/**
 * One overlay's URL-backed handle (D-10).
 *
 * `open` / `close` / `toggle` are referentially STABLE across renders — they
 * close over nuqs's stable setter only, so they are safe in a `useCallback`
 * dependency array and safe to hand to a memoized column factory.
 * `isOpen` / `value` / `dialogProps` / `href` change with the URL.
 */
export type OverlayHandle = {
  /** D-05: param absent = closed, param present = open. */
  isOpen: boolean
  /** D-05: the param value IS the payload — an entity id, or a literal mode such as `"new"`. */
  value: string | null
  open: (value?: string) => void
  close: () => void
  toggle: (value?: string) => void
  /** Spreads directly onto a Radix `Dialog` / `Sheet` / `Popover` root. */
  dialogProps: { open: boolean; onOpenChange: (open: boolean) => void }
  /**
   * Query-only href built from the CURRENT search params, so a link that opens
   * an overlay preserves the table's filters. Cast to `Route` at the call site;
   * `@villuh/ui` deliberately does not import from `next` (D-40).
   */
  href: (value?: string) => string
}

/** D-09: an overlay component receives its handle as a prop and never imports its own registry. */
export type OverlayComponent = React.ComponentType<{ overlay: OverlayHandle }>

/**
 * One registry entry (D-31 / D-47).
 *
 * `mount: "global"` — `<AppOverlays>` renders the component and passes the handle.
 * `mount: "page"`   — key is registered only; the page renders the component
 *                     itself and pulls its handle via `group.use(name)`. Used when
 *                     the overlay needs a live DOM ref that cannot cross a layout
 *                     boundary (the gallery Lightbox's `originRef`, D-32).
 */
export type OverlayDef = {
  component?: OverlayComponent
  mount: "global" | "page"
  /** Value written by `open()` / `href()` when the caller passes none. */
  defaultValue?: string
}

export type OverlayHandles<C extends Record<string, OverlayDef>> = {
  [K in keyof C & string]: OverlayHandle
}

export type OverlayGroup<
  C extends Record<string, OverlayDef> = Record<string, OverlayDef>,
> = {
  /** URL namespace; keys resolve to `${namespace}.${name}` (D-13). */
  namespace: string
  defs: C
  /** Frozen at module scope — required for nuqs setter stability (D-41). */
  urlKeys: Readonly<Record<keyof C & string, string>>
  /** All handles plus `closeAll()`, from a single `useQueryStates` call (D-13). */
  useGroup: () => OverlayHandles<C> & { closeAll: () => void }
  /** One handle. For `mount: "page"` overlays and for triggers. */
  use: <K extends keyof C & string>(name: K) => OverlayHandle
}

/**
 * Structural subset of a TanStack Query / tRPC result, widened from
 * `PageBoundaryQuery` (page.tsx:98-103) with `data.code` so `<OverlayBody>`
 * can discriminate NOT_FOUND from FORBIDDEN. Keeping it structural is what
 * keeps `@villuh/ui` free of a data-layer dependency.
 */
export type OverlayQuery<TData> = {
  data: TData | undefined
  isLoading: boolean
  isError?: boolean
  error?: { message: string; data?: { code?: string } | null } | null
}

/* ── Table query state ─────────────────────────────────────────────────── */

/**
 * One parsed predicate for one filter field. Deliberately has NO `id` — D-24's
 * deterministic chip id is minted by the consuming hook from field + operator +
 * index, so the parser's `eq` never has to compare an id it does not own.
 */
export type FieldFilter = { operator: string; values: string[] }

export type FilterOptionItem = { value: string; label: string }

/** Presentation props forwarded verbatim onto the emitted `FilterFieldConfig`. */
export type TableFieldUi = Omit<
  FilterFieldConfig,
  "key" | "icon" | "options" | "operators" | "server"
> & {
  label: string
  /** Icon by NAME, not JSX, so table configs stay plain `.ts` (D-37). */
  icon?: PlatformIconName
}

/**
 * One filter field declaration (D-21). Carries everything the URL parser, the
 * operator validator, the picker UI, and the tRPC input mapping need.
 */
export type TableFieldDef = TableFieldUi & {
  kind: "ids" | "numeric"
  /** D-19: the URL parser validates against exactly this list; anything else is dropped. */
  operators: FilterOperator[]
  /** D-30: fed unchanged into `buildDataTableServerInput`. */
  server: FilterServerMapping
  /**
   * D-22: options source. The binder calls this for EVERY field on EVERY render —
   * never conditionally — so the hook sequence is fixed. `hidden` lets the hook
   * gate its own tRPC query (`enabled: !hidden`) without changing the hook count.
   */
  useOptions?: (hidden: boolean) => FilterOptionItem[]
}

export type TableConfig<
  F extends Record<string, TableFieldDef> = Record<string, TableFieldDef>,
> = {
  fields: F
  /** Column ids `sort` is validated against (D-20). Must match the server's sort key enum. */
  sortable: readonly string[]
}

export type TableDefinition<
  F extends Record<string, TableFieldDef> = Record<string, TableFieldDef>,
> = {
  /**
   * Definition-unique identifier, independent of `namespace`. This is the OWNER
   * string handed to `registerQueryStateKeys`, and it is what makes the D-29
   * collision assert fire for its own stated trigger — two tables on one page.
   * The owner cannot be derived from `namespace`, because the collision case is
   * precisely two tables that are BOTH unprefixed (`namespace: null`): they would
   * share one owner string, the registry would read that as HMR re-registration,
   * and it would return silently on the very collision it exists to catch.
   */
  name: string
  /** `null` = unprefixed keys (`q`, `sort`, `page`, `size`, `<field>`) — the default (D-29). */
  namespace: string | null
  fieldKeys: readonly (keyof F & string)[]
  /** Frozen at module scope — required for nuqs setter stability (D-41). */
  parsers: Readonly<Record<string, unknown>>
  urlKeys: Readonly<Record<string, string>>
  /** D-22 binder. `hide` filters the RESULT, never the iteration (Pitfall 2). */
  useFilterFields: (options?: { hide?: readonly string[] }) => FilterFieldConfig[]
  /** Maps `DataTableQuery.filters` back into one param value per declared field. */
  toFieldParams: (filters: Filter[]) => Record<string, FieldFilter[] | null>
}
