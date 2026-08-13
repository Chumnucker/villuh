# Compact Filters Variant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `display="compact"` mode to the shared `Filters` component that replaces inline filter chips with a badge-counted trigger and full in-dropdown filter management, and adopt it on the property page units table.

**Architecture:** All behavior lives in `packages/ui/src/filters.tsx` as a display mode of the existing `Filters` component — same trigger, `F` shortcut, dropdown, submenus, and `Filter` data model. Compact mode adds a badge on the trigger, an "Active" section in the root dropdown (one row per filter instance, each opening an edit submenu with an operator row + value editor + remove item), a "Clear filters" footer item, and value-entry submenus for text/custom fields. A `filterDisplay` prop is threaded through `DataTable` → `DataTableToolbar` → `Filters`, and `UnitsList` exposes it so the property units page can opt in.

**Tech Stack:** React 19, Radix dropdown-menu wrappers in `packages/ui/src/dropdown-menu.tsx`, Tailwind v4, lucide-react, Turborepo + pnpm.

**Spec:** `docs/superpowers/specs/2026-08-12-compact-filters-design.md`

## Global Constraints

- `display` defaults to `"inline"`; inline mode's rendering and behavior must not change at all.
- No changes to the `Filter` data model (`{ id, field, operator, values }`), `FilterFieldConfig`, or `FilterServerMapping` / `buildDataTableServerInput`.
- Multiple filters on the same field remain fully supported in compact mode.
- New i18n keys are **optional** on `FilterI18nConfig` (follow the existing `loadingOptions?` precedent) with fallbacks to `DEFAULT_I18N`: `activeFilters` ("Active"), `clearFilters` ("Clear filters"), `removeFilter` ("Remove filter").
- `packages/ui` has no test harness (repo convention — server-only tests). Each task's verify step is `pnpm turbo run typecheck lint --filter=@villuh/ui` (add `--filter=@villuh/landlord-web` when app files change), plus a final manual browser checklist. Never bypass Turbo.
- Commit after each task. Do not stage unrelated files — the working tree has pre-existing uncommitted changes; `git add` only the files listed in the task.

---

### Task 1: `display` prop, trigger badge, chip suppression, i18n keys

**Files:**
- Modify: `packages/ui/src/filters.tsx`

**Interfaces:**
- Consumes: existing `FiltersProps`, `fieldsMap`, `filters`.
- Produces: `FiltersProps.display?: "inline" | "compact"` (default `"inline"`); `display` variable available inside `Filters`; optional i18n keys `activeFilters?`, `clearFilters?`, `removeFilter?` on `FilterI18nConfig` with defaults in `DEFAULT_I18N`. Later tasks read `display` and these keys.

- [ ] **Step 1: Add the i18n keys**

In `FilterI18nConfig`, next to the existing optional keys:

```ts
  // Async option loading states (optional; fall back to sensible defaults)
  loadingOptions?: string
  errorLoadingOptions?: string
  // Compact display mode labels (optional; fall back to sensible defaults)
  activeFilters?: string
  clearFilters?: string
  removeFilter?: string
```

In `DEFAULT_I18N`, after `errorLoadingOptions`:

```ts
  activeFilters: "Active",
  clearFilters: "Clear filters",
  removeFilter: "Remove filter",
```

- [ ] **Step 2: Add the `display` prop**

In `FiltersProps`:

```ts
  /**
   * "inline" renders one chip per active filter next to the trigger (current
   * behavior). "compact" renders no chips: the trigger gets a count badge and
   * filters are managed inside the dropdown.
   */
  display?: "inline" | "compact"
```

Destructure in `Filters` with `display = "inline"`.

- [ ] **Step 3: Badge on the trigger + chip suppression**

Inside `Filters`, compute the count of renderable filters (those whose field still exists):

```tsx
  const activeFilterCount = useMemo(
    () => filters.filter((filter) => Boolean(fieldsMap[filter.field])).length,
    [filters, fieldsMap]
  )
```

Extract the current trigger JSX into a variable so it isn't duplicated:

```tsx
  const triggerNode = trigger || (
    <Button
      variant="outline"
      size={size === "sm" ? "icon-sm" : size === "lg" ? "icon-lg" : "icon"}
      className={filterChipSurfaceClassName}
    >
      <PlatformIcon icon="IconListBullets" size={16} />
    </Button>
  )
```

Replace the current `<DropdownMenuTrigger asChild>{trigger || (...)}</DropdownMenuTrigger>` with:

```tsx
  {display === "compact" ? (
    <div className="relative">
      <DropdownMenuTrigger asChild>{triggerNode}</DropdownMenuTrigger>
      {activeFilterCount > 0 && (
        <span
          aria-hidden
          className="bg-primary text-primary-foreground pointer-events-none absolute -top-1.5 -right-1.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums"
        >
          {activeFilterCount}
        </span>
      )}
    </div>
  ) : (
    <DropdownMenuTrigger asChild>{triggerNode}</DropdownMenuTrigger>
  )}
```

Suppress chips in compact mode — wrap the existing `filters.map((filter) => { ... ButtonGroup ... })` block:

```tsx
  {display === "inline" &&
    filters.map((filter) => {
      /* existing chip block unchanged */
    })}
```

Also update the dropdown's render condition so compact mode can still open the menu (to edit/clear) even if every field were somehow filtered out of `selectableFields`:

```tsx
  {(selectableFields.length > 0 ||
    (display === "compact" && filters.length > 0)) && (
    <DropdownMenu ... >
```

- [ ] **Step 4: Verify**

Run: `pnpm turbo run typecheck lint --filter=@villuh/ui`
Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/filters.tsx
git commit -m "feat(ui): add display prop, trigger badge, and chip suppression to Filters"
```

---

### Task 2: Filter summary formatter + edit submenu content component

**Files:**
- Modify: `packages/ui/src/filters.tsx`

**Interfaces:**
- Consumes: `getOperatorsForField`, `resolveSelectedOptions`, `FilterOptionsList`, `TextFilterValue`, `DropdownMenuItem` (supports `variant="destructive"`), `DropdownMenuGroup`, `DropdownMenuSeparator`, `FilterI18nConfig`, `Filter<T>`, `FilterFieldConfig<T>`.
- Produces (used by Tasks 3 and 4):
  - `formatFilterSummary<T>(field: FilterFieldConfig<T>, filter: Filter<T>, i18n: FilterI18nConfig): string`
  - `function FilterEditSubmenuContent<T>(props: FilterEditSubmenuContentProps<T>)` with:

```ts
interface FilterEditSubmenuContentProps<T = unknown> {
  filter: Filter<T>
  field: FilterFieldConfig<T>
  /** Partial update merged into the filter (values auto-clear on empty/not_empty via updateFilter). */
  onUpdate: (updates: Partial<Filter<T>>) => void
  onRemove: () => void
  /** Collapse back to the root menu (ArrowLeft / single-select pick). */
  onBack: () => void
  /** Close the whole dropdown (Escape). */
  onCloseMenu: () => void
  /** Gate async option loading until the submenu is open. */
  enabled: boolean
}
```

- [ ] **Step 1: Add `ChevronDownIcon` to the lucide import**

```ts
import { AlertCircleIcon, XIcon, CheckIcon, ChevronDownIcon } from "lucide-react"
```

- [ ] **Step 2: Add the summary formatter** (place it near `resolveSelectedOptions`)

```tsx
/**
 * One-line summary for a compact active-filter row: "operator · values".
 * empty/not_empty render the operator alone.
 */
const formatFilterSummary = <T = unknown,>(
  field: FilterFieldConfig<T>,
  filter: Filter<T>,
  i18n: FilterI18nConfig
): string => {
  const operators = getOperatorsForField(field, filter.values, i18n)
  const opLabel =
    operators.find((op) => op.value === filter.operator)?.label ??
    i18n.helpers.formatOperator(filter.operator)

  if (filter.operator === "empty" || filter.operator === "not_empty") {
    return opLabel
  }

  if (field.type === "text") {
    const raw = String(filter.values[0] ?? "")
    if (!raw) return opLabel
    const prefix = typeof field.prefix === "string" ? field.prefix : ""
    const suffix = typeof field.suffix === "string" ? field.suffix : ""
    return `${opLabel} · ${prefix}${raw}${suffix}`
  }

  const selected = resolveSelectedOptions(field, filter.values)
  if (selected.length === 0) return opLabel
  const valuePart =
    selected.length > 3
      ? `${selected.length} ${i18n.selectedCount}`
      : selected.map((opt) => opt.label).join(", ")
  return `${opLabel} · ${valuePart}`
}
```

- [ ] **Step 3: Add `FilterEditSubmenuContent`** (place it after `FilterValueSelector`)

```tsx
/**
 * Body of a compact-mode edit submenu: operator row (toggles to an inline
 * operator list), value editor, and a destructive remove item.
 */
function FilterEditSubmenuContent<T = unknown>({
  filter,
  field,
  onUpdate,
  onRemove,
  onBack,
  onCloseMenu,
  enabled,
}: FilterEditSubmenuContentProps<T>) {
  const context = useFilterContext()
  const [showOperators, setShowOperators] = useState(false)

  const operators = useMemo(
    () => getOperatorsForField(field, filter.values, context.i18n),
    [field, filter.values, context.i18n]
  )
  const operatorLabel =
    operators.find((op) => op.value === filter.operator)?.label ??
    context.i18n.helpers.formatOperator(filter.operator)
  const hideValueEditor =
    filter.operator === "empty" || filter.operator === "not_empty"

  const isMultiSelect = field.type === "multiselect" || filter.values.length > 1

  return (
    <div className="flex flex-col">
      <DropdownMenuGroup className="px-1.5">
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            setShowOperators((prev) => !prev)
          }}
          className="text-muted-foreground justify-between"
        >
          <span>{operatorLabel}</span>
          <ChevronDownIcon
            className={cn(
              "size-3.5 transition-transform",
              showOperators && "rotate-180"
            )}
          />
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator className="mx-0" />

      {showOperators ? (
        <DropdownMenuGroup className="px-1.5">
          {operators.map((op) => (
            <DropdownMenuItem
              key={op.value}
              onSelect={(e) => {
                e.preventDefault()
                onUpdate({ operator: op.value })
                setShowOperators(false)
              }}
              className="flex items-center justify-between"
            >
              <span>{op.label}</span>
              <CheckIcon
                className={cn(
                  "text-primary ms-auto",
                  op.value === filter.operator ? "opacity-100" : "opacity-0"
                )}
              />
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      ) : hideValueEditor ? null : field.customRenderer ? (
        <div className="px-2 py-1.5">
          {field.customRenderer({
            field,
            values: filter.values,
            onChange: (values) => onUpdate({ values }),
            operator: filter.operator,
          })}
        </div>
      ) : field.type === "text" ? (
        <div className="p-1.5 [&_[data-slot=input-group]]:w-full">
          <TextFilterValue
            field={field}
            values={filter.values}
            onChange={(values) => onUpdate({ values })}
            autoFocus
          />
        </div>
      ) : (
        <FilterOptionsList<T>
          field={field}
          selectedValues={filter.values}
          isMultiSelect={isMultiSelect}
          enabled={enabled}
          onBack={onBack}
          onClose={onCloseMenu}
          onToggle={(option, isSelected) => {
            const next = isSelected
              ? filter.values.filter((v) => v !== option.value)
              : isMultiSelect
                ? [...filter.values, option.value]
                : [option.value]
            onUpdate({ values: next })
            if (!isMultiSelect) onBack()
          }}
        />
      )}

      {!showOperators && (
        <>
          <DropdownMenuSeparator className="mx-0" />
          <DropdownMenuGroup className="px-1.5">
            <DropdownMenuItem variant="destructive" onSelect={onRemove}>
              <XIcon />
              {context.i18n.removeFilter ?? DEFAULT_I18N.removeFilter}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </>
      )}
    </div>
  )
}
```

Notes for the implementer:
- The `TextFilterValue` input defaults to `w-36` (from `FilterInput`), narrower than the `w-[220px]` submenu. Don't touch `field.className` (consumer-owned); the wrapper's `[&_[data-slot=input-group]]:w-full` stretches it — `InputGroup` renders `data-slot="input-group"` (verified in `input-group.tsx:14`).
- `onUpdate` merges partials via the existing `updateFilter`, which already clears `values` when the operator becomes `empty`/`not_empty` — do not duplicate that logic here.

- [ ] **Step 4: Verify**

Run: `pnpm turbo run typecheck lint --filter=@villuh/ui`
Expected: both pass. (`FilterEditSubmenuContent` and `formatFilterSummary` are not yet referenced — if the linter flags them as unused, add a temporary `void FilterEditSubmenuContent; void formatFilterSummary` **only if needed**, and remove it in Task 3.)

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/filters.tsx
git commit -m "feat(ui): add filter summary formatter and edit submenu content for compact mode"
```

---

### Task 3: Active section in the root dropdown + keyboard navigation + Clear filters

**Files:**
- Modify: `packages/ui/src/filters.tsx`

**Interfaces:**
- Consumes: `FilterEditSubmenuContent`, `formatFilterSummary` (Task 2), `display` (Task 1), existing state: `openSubMenu`, `activeMenu`, `highlightedIndex`, `menuSearchInput`, `updateFilter`, `removeFilter`.
- Produces: `activeEntries` (also used by Task 4's index offsets). Edit-submenu open state is keyed as `` `edit:${filter.id}` `` in the existing `openSubMenu` string state.

- [ ] **Step 1: Compute active entries** (inside `Filters`, after `filteredFields`)

```tsx
  // Compact mode: active filter instances shown at the top of the root menu.
  // Search-filtered by field label so the menu search stays coherent.
  const activeEntries = useMemo(() => {
    if (display !== "compact") return []
    return filters
      .map((filter) => ({ filter, field: fieldsMap[filter.field] }))
      .filter(
        (entry): entry is { filter: Filter<T>; field: FilterFieldConfig<T> } =>
          Boolean(entry.field)
      )
      .filter(
        (entry) =>
          !menuSearchInput ||
          entry.field.label
            ?.toLowerCase()
            .includes(menuSearchInput.toLowerCase())
      )
  }, [display, filters, fieldsMap, menuSearchInput])
```

- [ ] **Step 2: Extend the keyboard index space**

Active rows occupy indices `0..activeEntries.length - 1`; field rows follow. Update the root search input's `onKeyDown` and the highlight effects:

1. Everywhere the handler uses `filteredFields.length` as the navigation bound (ArrowDown/ArrowUp wrap logic and the `useEffect` that resets `highlightedIndex` to 0 when the menu opens), use:

```tsx
  const navigableCount = activeEntries.length + filteredFields.length
```

2. In the ArrowRight/ArrowLeft branch and the Enter branch, resolve what's highlighted first:

```tsx
  const activeEntry =
    highlightedIndex >= 0 && highlightedIndex < activeEntries.length
      ? activeEntries[highlightedIndex]
      : null
  const field = activeEntry
    ? null
    : filteredFields[highlightedIndex - activeEntries.length]
```

- ArrowRight on an active entry: `setOpenSubMenu(`edit:${activeEntry.filter.id}`)`; `setActiveMenu(`edit:${activeEntry.filter.id}`)`.
- Enter on an active entry: same as ArrowRight (toggle closed if already open, mirroring the existing field-submenu Enter behavior).
- ArrowLeft: unchanged (closes any open submenu).
- Field branches: identical logic to today, but reading `field` from the offset expression above, and the field rows' ids/`isHighlighted` comparisons use `index + activeEntries.length` (see Step 3).

3. The `useEffect` that sets `setHighlightedIndex(0)` when `addFilterOpen && filteredFields.length > 0` becomes `addFilterOpen && navigableCount > 0`.

- [ ] **Step 3: Render the active section**

Inside the `<ScrollArea>` in the root menu content, **before** the `filteredFields.map(...)` block, render (only when `activeEntries.length > 0`):

```tsx
  <DropdownMenuLabel className="text-muted-foreground text-xs">
    {mergedI18n.activeFilters ?? DEFAULT_I18N.activeFilters}
  </DropdownMenuLabel>
  {activeEntries.map((entry, index) => {
    const isHighlighted = highlightedIndex === index
    const itemId = `${rootId}-item-${index}`
    const subId = `edit:${entry.filter.id}`
    return (
      <DropdownMenuSub
        key={entry.filter.id}
        open={openSubMenu === subId}
        onOpenChange={(open) => {
          if (open) {
            setOpenSubMenu(subId)
          } else if (openSubMenu === subId) {
            setOpenSubMenu(null)
            setActiveMenu("root")
          }
        }}
      >
        <DropdownMenuSubTrigger
          id={itemId}
          role="option"
          aria-selected={isHighlighted}
          data-highlighted={isHighlighted || undefined}
          onMouseEnter={() => setHighlightedIndex(index)}
          className="data-[state=open]:bg-accent data-[state=open]:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground"
        >
          {entry.field.icon}
          <span className="shrink-0">{entry.field.label}</span>
          <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
            {formatFilterSummary(entry.field, entry.filter, mergedI18n)}
          </span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-[220px] px-0">
          <FilterEditSubmenuContent<T>
            filter={entry.filter}
            field={entry.field}
            enabled={openSubMenu === subId}
            onUpdate={(updates) => updateFilter(entry.filter.id, updates)}
            onRemove={() => {
              removeFilter(entry.filter.id)
              setOpenSubMenu(null)
              setActiveMenu("root")
            }}
            onBack={() => {
              setOpenSubMenu(null)
              setActiveMenu("root")
            }}
            onCloseMenu={() => setAddFilterOpen(false)}
          />
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    )
  })}
  <DropdownMenuSeparator />
```

`DropdownMenuLabel` needs adding to the `./dropdown-menu` import list.

Then offset the **field** rows: in the existing `filteredFields.map((field, index) => ...)` body, replace `highlightedIndex === index` with `highlightedIndex === index + activeEntries.length`, `` `${rootId}-item-${index}` `` with `` `${rootId}-item-${index + activeEntries.length}` ``, and `setHighlightedIndex(index)` with `setHighlightedIndex(index + activeEntries.length)`.

Also update the empty state: the `noFieldsFound` message renders only when `filteredFields.length === 0 && activeEntries.length === 0`.

- [ ] **Step 4: Clear filters footer item**

After the listbox `</div></div>` (i.e. after the scrollable field list, still inside `DropdownMenuContent`):

```tsx
  {display === "compact" && filters.length > 0 && (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={() => {
          onChange([])
          setAddFilterOpen(false)
        }}
      >
        <XIcon className="text-muted-foreground" />
        {mergedI18n.clearFilters ?? DEFAULT_I18N.clearFilters}
      </DropdownMenuItem>
    </>
  )}
```

- [ ] **Step 5: Verify**

Run: `pnpm turbo run typecheck lint --filter=@villuh/ui`
Expected: both pass (remove any temporary `void` reference from Task 2).

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/filters.tsx
git commit -m "feat(ui): active filter section, edit submenus, and clear item in compact Filters"
```

---

### Task 4: Compact add flow for text/custom fields

**Files:**
- Modify: `packages/ui/src/filters.tsx`

**Interfaces:**
- Consumes: `FilterEditSubmenuContent` (Task 2), `activeEntries` offsets (Task 3), existing `sessionFilterIds` state, `createFilter`, `getOperatorsForField`.
- Produces: internal `CompactAddValueSubmenuContent<T>` and a `commitAddValueFilter` helper inside `Filters`. No external API changes.

Today, selecting a text field adds a chip with an autofocused input; in compact mode there is no chip, so text (and custom-renderer) fields get a submenu with an operator row + value editor. The filter is created on the first committed value (or immediately for `empty`/`not_empty`), mirroring the multiselect session behavior.

- [ ] **Step 1: Add the create-or-update session helper** (inside `Filters`, near `addFilter`)

```tsx
  // Compact add flow: create the field's session filter on first value commit,
  // then keep updating that same instance while the menu stays open.
  const commitAddValueFilter = useCallback(
    (field: FilterFieldConfig<T>, operator: string, values: T[]) => {
      const fieldKey = field.key as string
      const sessionFilterId = sessionFilterIds[fieldKey]
      const sessionFilter = sessionFilterId
        ? filters.find((f) => f.id === sessionFilterId)
        : null

      const isEmptyOp = operator === "empty" || operator === "not_empty"
      const hasValue = values.some((v) => String(v ?? "") !== "")

      if (sessionFilter) {
        if (!isEmptyOp && !hasValue) {
          // Value cleared before menu closed — retract the session filter.
          onChange(filters.filter((f) => f.id !== sessionFilter.id))
          setSessionFilterIds((prev) => {
            const next = { ...prev }
            delete next[fieldKey]
            return next
          })
        } else {
          onChange(
            filters.map((f) =>
              f.id === sessionFilter.id
                ? { ...f, operator, values: isEmptyOp ? ([] as T[]) : values }
                : f
            )
          )
        }
      } else if (isEmptyOp || hasValue) {
        const newFilter = createFilter<T>(
          fieldKey,
          operator,
          isEmptyOp ? ([] as T[]) : values
        )
        onChange([...filters, newFilter])
        setSessionFilterIds((prev) => ({ ...prev, [fieldKey]: newFilter.id }))
      }
    },
    [filters, onChange, sessionFilterIds]
  )
```

- [ ] **Step 2: Add `CompactAddValueSubmenuContent`** (top level, after `FilterEditSubmenuContent`)

Holds local operator/draft state so the component never remounts mid-typing; every change commits upward.

```tsx
/**
 * Add-flow submenu body for compact mode's text/custom fields: local operator
 * + draft value, committed upward on every change (creating the filter on the
 * first non-empty commit).
 */
function CompactAddValueSubmenuContent<T = unknown>({
  field,
  onCommit,
}: {
  field: FilterFieldConfig<T>
  /** Create-or-update this field's session filter. */
  onCommit: (operator: string, values: T[]) => void
}) {
  const context = useFilterContext()
  const [operator, setOperator] = useState(
    () =>
      field.defaultOperator ||
      (field.type === "multiselect" ? "is_any_of" : "is")
  )
  const [values, setValues] = useState<T[]>([])
  const [showOperators, setShowOperators] = useState(false)

  const operators = useMemo(
    () => getOperatorsForField(field, values, context.i18n),
    [field, values, context.i18n]
  )
  const operatorLabel =
    operators.find((op) => op.value === operator)?.label ??
    context.i18n.helpers.formatOperator(operator)
  const isEmptyOp = operator === "empty" || operator === "not_empty"

  return (
    <div className="flex flex-col">
      <DropdownMenuGroup className="px-1.5">
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            setShowOperators((prev) => !prev)
          }}
          className="text-muted-foreground justify-between"
        >
          <span>{operatorLabel}</span>
          <ChevronDownIcon
            className={cn(
              "size-3.5 transition-transform",
              showOperators && "rotate-180"
            )}
          />
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator className="mx-0" />

      {showOperators ? (
        <DropdownMenuGroup className="px-1.5">
          {operators.map((op) => (
            <DropdownMenuItem
              key={op.value}
              onSelect={(e) => {
                e.preventDefault()
                setOperator(op.value)
                setShowOperators(false)
                // empty/not_empty are complete without a value; commit now.
                // A typed draft re-commits under the new operator.
                if (op.value === "empty" || op.value === "not_empty") {
                  onCommit(op.value, [] as T[])
                } else if (values.some((v) => String(v ?? "") !== "")) {
                  onCommit(op.value, values)
                }
              }}
              className="flex items-center justify-between"
            >
              <span>{op.label}</span>
              <CheckIcon
                className={cn(
                  "text-primary ms-auto",
                  op.value === operator ? "opacity-100" : "opacity-0"
                )}
              />
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      ) : isEmptyOp ? null : field.customRenderer ? (
        <div className="px-2 py-1.5">
          {field.customRenderer({
            field,
            values,
            onChange: (next) => {
              setValues(next)
              onCommit(operator, next)
            },
            operator,
          })}
        </div>
      ) : (
        <div className="p-1.5 [&_[data-slot=input-group]]:w-full">
          <TextFilterValue
            field={field}
            values={values}
            onChange={(next) => {
              setValues(next)
              onCommit(operator, next)
            }}
            autoFocus
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Route compact text/custom fields into the submenu**

In the `filteredFields.map(...)` render body, `hasSubMenu` currently covers only select/multiselect with options. Add:

```tsx
  const isCompactValueField =
    display === "compact" &&
    !hasSubMenu &&
    (field.type === "text" || Boolean(field.customRenderer))
```

When `isCompactValueField`, render a `DropdownMenuSub` (same open/onOpenChange pattern as the option submenus, keyed by `field.key`) whose `DropdownMenuSubContent className="w-[220px] px-0"` contains:

```tsx
  <CompactAddValueSubmenuContent<T>
    field={field}
    onCommit={(operator, values) => commitAddValueFilter(field, operator, values)}
  />
```

The plain `DropdownMenuItem` fallback (which calls `addFilter`) remains for anything else — in compact mode that path is only reachable for select-type fields with no options, which have no value UI anyway.

Also extend the keyboard handler's `hasSubMenu` checks (ArrowRight/Enter in the root input's `onKeyDown`) so `isCompactValueField` fields open their submenu instead of calling `addFilter`. Factor the check into one helper used by both the render and the handler:

```tsx
  const fieldOpensSubmenu = (field: FilterFieldConfig<T>): boolean => {
    const hasOptionsSub =
      (field.type === "select" || field.type === "multiselect") &&
      fieldHasOptions(field)
    return (
      hasOptionsSub ||
      (display === "compact" &&
        (field.type === "text" || Boolean(field.customRenderer)))
    )
  }
```

- [ ] **Step 4: Verify**

Run: `pnpm turbo run typecheck lint --filter=@villuh/ui`
Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/filters.tsx
git commit -m "feat(ui): compact add-flow submenu for text and custom filter fields"
```

---

### Task 5: `filterDisplay` passthrough + units table adoption

**Files:**
- Modify: `packages/ui/src/data-table-toolbar.tsx`
- Modify: `packages/ui/src/data-table.tsx`
- Modify: `apps/landlord-web/modules/units/components/list/index.tsx`
- Modify: `apps/landlord-web/modules/properties/templates/property-units-template.tsx`

**Interfaces:**
- Consumes: `FiltersProps.display` (Task 1).
- Produces: `filterDisplay?: "inline" | "compact"` on `DataTableToolbarProps`, `DataTableProps`, and `UnitsListProps` (all default `"inline"` by omission).

- [ ] **Step 1: `DataTableToolbar`**

Add to `DataTableToolbarProps`:

```ts
  /** Filters presentation: inline chips (default) or compact in-dropdown management. */
  filterDisplay?: "inline" | "compact"
```

Destructure `filterDisplay` in the component and pass it through:

```tsx
  <Filters
    filters={query.filters}
    fields={filterFields!}
    size="sm"
    display={filterDisplay}
    enableShortcut
    onChange={(filters) => onQueryChange({ ...query, filters })}
  />
```

- [ ] **Step 2: `DataTable`**

Add `filterDisplay?: "inline" | "compact"` to `DataTableProps` (next to `filterFields`), destructure it, and forward it on the `<DataTableToolbar ... filterDisplay={filterDisplay} />` call.

- [ ] **Step 3: `UnitsList`**

Add to `UnitsListProps`:

```ts
  /** Filters presentation for the toolbar — use "compact" in narrow layouts. */
  filterDisplay?: "inline" | "compact"
```

Destructure it in `UnitsList` and pass `filterDisplay={filterDisplay}` to `<DataTable ... />`.

- [ ] **Step 4: Property page adoption**

In `property-units-template.tsx`, the `<UnitsList ...>` call gains `filterDisplay="compact"`:

```tsx
  <UnitsList
    lockedPropertyId={propertyId}
    filterDisplay="compact"
    onEdit={(unit) => { ... }}
    onArchive={setArchivingUnit}
  />
```

The global units page (which renders `UnitsList` without the prop) stays inline.

- [ ] **Step 5: Verify**

Run: `pnpm turbo run typecheck lint --filter=@villuh/ui --filter=@villuh/landlord-web`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/data-table-toolbar.tsx packages/ui/src/data-table.tsx apps/landlord-web/modules/units/components/list/index.tsx apps/landlord-web/modules/properties/templates/property-units-template.tsx
git commit -m "feat: thread filterDisplay through DataTable and adopt compact filters on property units"
```

---

### Task 6: Manual verification

**Files:** none (browser verification against the running dev server).

- [ ] **Step 1: Compact mode on the property units page** (`/properties/{id}` → Units tab)

- Trigger renders with no chips; `F` opens the dropdown; Escape closes it.
- Add a Status filter (multiselect submenu): toggle two values → badge shows `1` (one instance); root menu shows an "Active" row "Status — is any of · X, Y".
- Open the Status active row's submenu: values are checked; toggling edits the table live; operator row switches to the operator list and back; picking "is not any of" updates the row summary and results.
- Add a rent/number filter via its add submenu: operator row + input, filter created on first commit; clearing the input before closing retracts it.
- Set an operator to "is empty": value editor hides, summary shows the operator alone.
- Add a second filter on the same field: two Active rows, badge shows the instance count.
- "Remove filter" removes one instance; "Clear filters" empties everything and the badge disappears.
- Keyboard: ArrowDown/Up walks active rows then field rows; ArrowRight/Enter opens the highlighted submenu; ArrowLeft collapses back.
- Async options field (Property filter on the global units page has static options — if no async field is reachable here, verify async via any `loadOptions` field available, else note it as not applicable).

- [ ] **Step 2: Inline regression** (global units list `/units` and properties list)

- Chips render and behave exactly as before (add, operator dropdown, value popover, remove, clear button, `F` shortcut). No badge appears.

- [ ] **Step 3: Fix anything found, re-verify, and commit fixes**

```bash
git add packages/ui/src/filters.tsx
git commit -m "fix(ui): compact filters polish from manual verification"
```

(Only if fixes were needed; scope the message to what actually changed.)
