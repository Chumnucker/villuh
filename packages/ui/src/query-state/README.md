# query-state

URL-backed UI state, built on [nuqs](https://nuqs.dev). Two subsystems share
one URL and one set of conventions:

- **Tables** — `defineTable` + `useDataTableQueryState`: search, filters,
  sort, and pagination for a `DataTable`, one readable query param per field.
- **Overlays** — `createOverlays` + `<AppOverlays>`: dialogs, sheets, and
  lightboxes whose open/closed state (and payload) lives in the URL, so every
  overlay is deep-linkable and browser back closes it.

Both were introduced in phase 03.1 (`.planning/phases/03.1-url-query-state/`),
which holds the original decision log (the `D-xx` ids) and research notes.

## URL anatomy

```
/units?q=main&status=any:s1,s2&baseRent=gte:1500,lte:3000&sort=-baseRent&page=2&size=50&unit.form=u_123
       └──── table params (unprefixed) ─────────────────────────────────────┘ └─ overlay param ─┘
```

### Key schemes

| Kind    | Scheme                        | Example                     |
| ------- | ----------------------------- | --------------------------- |
| table   | unprefixed (the default)      | `q`, `sort`, `page`, `size`, `status` |
| table   | `:`-prefixed when one page hosts two tables | `units:status` |
| overlay | always dot-namespaced         | `unit.form`, `property.tags` |

Dots are reserved for overlays and colons for tables, so the two schemes can
never converge — `key-registry.ts` enforces the schemes in dev. The real
hazard is two nuqs hooks bound to one key with different parsers mounted **at
the same time** (they cross-contaminate silently), so collision detection
runs at the scope where each kind can actually collide:

- **Overlay keys** must be app-globally unique — `<AppOverlays>` mounts every
  group on every page — so the guard throws at module evaluation.
- **Table keys** only need to be unique per page — tables on different routes
  never coexist, so `/units?q=…` and `/tenants?q=…` share `q` freely. The
  guard claims keys on mount (inside `useDataTableQueryState`) and throws
  only when two mounted tables bind the same key.

### Table filter grammar

One param per filter field: `field=op:v1,v2` with `,`-joined predicates, e.g.
`baseRent=gte:1500,lte:3000` or `status=any:s1,s2`. Operators are URL aliases
(`any`, `!any`, `empty`, `!empty`, `eq`, `neq`, `gt`, `gte`, `lt`, `lte`)
mapped to the internal vocabulary `data-table-query.ts` consumes. Rules:

- Unknown operators and operators outside the field's declared list are
  **dropped, never thrown** — a hand-edited URL degrades gracefully.
- `empty` / `!empty` are valueless and must be the **only** predicate on their
  field (a bare alias trailing a value-bearing predicate would be read as a
  continuation value).
- Values escape the grammar delimiters as `~~` / `~c` (`:`) / `~s` (`,`),
  decoded in a **single left-to-right scan** — sequential `.replace` passes
  are not bijective. `~` survives nuqs's encoder verbatim, which is what keeps
  the URLs hand-editable; `encodeURIComponent` would double-escape.
- `sort=-baseRent` = descending; ids are validated against the declared
  `sortable` list. `page` is 1-based in the URL, 0-based in state
  (`parseAsIndex`). `size` is allow-listed against `DATA_TABLE_PAGE_SIZES`.

### Overlay params

Absent = closed, present = open — the param value IS the payload:

- **entity** overlays carry an entity id, or the def's `createValue`
  (`"new"` by default) for create mode: `?unit.form=u_123`, `?unit.form=new`.
  Handles expose the split pre-derived: `entityId` (null in create mode) and
  `isCreate`.
- **flag** overlays carry no payload; the value is the constant `"open"`
  purely so the URL reads well: `?property.tags=open`.

## History semantics

| Action        | History     | Why |
| ------------- | ----------- | --- |
| overlay open  | `push`      | browser back closes an open overlay |
| overlay close | `replace`   | closing via the UI must not strand a forward entry that re-opens it |
| table change  | `replace`   | nobody should need twelve back presses to escape a table they filtered |

**Caveat:** nuqs's throttle queue merges every update inside a ~150 ms window
into ONE history write and applies `push` if any contributor asked for it.
Never fire an overlay open and a table update from the same handler.

## Invariants (the things that break subtly)

1. **Parser maps and urlKeys are frozen at module scope and never rebuilt.**
   `defineTable` / `createOverlays` must be called at module scope only. A
   keyMap rebuilt per render destabilizes nuqs's setter identity, which
   permanently re-arms `DataTableToolbar`'s 300 ms search debounce — the
   search box never commits.
2. **Every non-primitive parser declares `eq`.** nuqs uses it for
   `clearOnDefault` and for its keyMap-stability heuristic; omitting it costs
   a clean URL and a stable setter.
3. **`useFilterFields` runs every field's `useOptions` on every render,
   hidden or not.** The config is frozen and its entry order fixed, so the
   loop unrolls to a fixed hook sequence; `hidden` gates the tRPC query via
   `enabled`, and only the *result* is filtered. Skipping the iteration
   changes the hook count between pages that hide different fields.
4. **Globally mounted overlay components gate their queries on
   `overlay.isOpen`.** `<AppOverlays>` keeps them mounted on every
   authenticated page; an ungated query fires app-wide. Gate the QUERY, never
   the JSX — conditionally rendering the overlay unmounts the Radix root
   before its exit animation can run.
5. **Overlay `href()` merges into the current search params.** Serializing
   without the base starts from an empty `URLSearchParams` and silently drops
   every table filter from the link.
6. **Every module here carries `"use client"`.** nuqs is a client module;
   without the directive a barrel re-export evaluates in the RSC server graph
   where the parsers are client-reference proxies.

## Adding things

**A filter field:** one entry in the table's `defineTable` config — URL
parsing, operator validation, picker UI, and tRPC input mapping all derive
from it. Field keys `q` / `sort` / `page` / `size` are reserved.

**An overlay:** one line in the module's `createOverlays` config plus the
component. The component receives its handle as an `overlay` prop
(`EntityOverlayHandle` / `FlagOverlayHandle`) and never imports its own
registry back — that keeps the import graph acyclic. Use `mount: "page"`
(`pageEntity`) only when the overlay needs something that cannot cross a
layout boundary — today that is exactly one case, the gallery Lightbox's live
`originRef` to the clicked thumbnail. A second case is a signal to rethink
the global-mount design.

**A second table on one page:** give at least one of the tables a `namespace`
so its keys prefix apart; the dev-time mount guard throws if you forget. A
second table on a *different* page needs nothing — unprefixed keys are the
default precisely because routes never share a URL.
