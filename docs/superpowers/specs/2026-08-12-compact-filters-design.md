# Compact Filters Variant — Design

> **Post-UAT revision (2026-08-12, commits `4643562` + `24e16e8`):** user testing rejected the separate "Active" section. The shipped design instead makes each field row the edit surface: in compact mode every field submenu (option, text, and custom fields) opens with an operator row on top, a value editor bound live to the field's filter, and a destructive "Remove filter" item when a filter exists. Fields with an active filter show a small primary dot on their row (no value summary in the root menu). "Clear filters" uses the destructive item variant. Consequence: compact mode edits one filter per field (the field's first filter); multiple instances per field remain supported only in inline mode. The unit Status filter is configured `searchable: false`. The sections below describe the original pre-UAT design where they mention the "Active" section.

**Date:** 2026-08-12
**Component:** `packages/ui/src/filters.tsx` (`Filters`), `packages/ui/src/data-table-toolbar.tsx` (`DataTableToolbar`)
**Motivating use case:** the units table on the property page (`apps/landlord-web/modules/properties/templates/property-units-template.tsx`), where the page's narrow max-width leaves no horizontal room for filter chips.

## Problem

The current `Filters` component renders one horizontal chip per active filter (field label + operator dropdown + value popover + remove button). On full-width table pages this works well, but inside narrow centered layouts the chips wrap vertically after a single filter and look broken. We need a second display mode that keeps the exact same trigger, dropdown, submenus, keyboard shortcut, and data model, but manages active filters entirely inside the dropdown instead of rendering chips.

## Non-goals

- No changes to the `Filter` data model (`{ id, field, operator, values }`), the `FilterFieldConfig` API, or the server mapping (`FilterServerMapping` / `buildDataTableServerInput`).
- No changes to the existing inline (chip) mode's behavior or appearance.
- No new standalone component — this is a display mode of `Filters`.

## API

- `Filters` gains `display?: "inline" | "compact"`, defaulting to `"inline"`. (`variant` is already taken by the solid/default styling axis.)
- `DataTableToolbar` gains a passthrough prop `filterDisplay?: "inline" | "compact"`, defaulting to `"inline"`, forwarded to `Filters`.
- Everything else (`enableShortcut`, `i18n`, `size`, `allowMultiple`, etc.) behaves identically in both modes. Multiple filters on the same field remain fully supported in compact mode.
- New i18n keys with defaults: `activeFilters` ("Active"), `clearFilters` ("Clear filters"), `removeFilter` ("Remove filter").

## Compact mode behavior

### Trigger badge

- The trigger is unchanged (same button, same `F` shortcut, same custom `trigger` support).
- When one or more filters are active, a small badge is absolutely positioned at the top-right of the trigger (e.g. `absolute -top-1.5 -right-1.5`, `rounded-full`, primary background, ~1rem circle) showing the count of active filter *instances* (two Rent filters = 2). The trigger wrapper becomes `relative` to anchor it.
- No chips are rendered in compact mode.

### Root dropdown layout

Top to bottom:

1. Search input (unchanged, with the `F` kbd hint).
2. **Active section** (only when at least one filter exists): a labelled group with one row per active filter instance, in `filters` array order. Each row shows the field icon + field label, and a muted single-line summary of `operator label + value summary`, truncated with ellipsis. Value summary rules:
   - select/multiselect: selected option labels joined with ", " (resolved via the existing option cache for async fields); if more than 3, "N selected".
   - text/number: the raw value (with the field's prefix/suffix if configured).
   - `empty` / `not_empty`: operator label only, no value part.
   Each row is a `DropdownMenuSub` trigger opening the **edit submenu** (below).
3. Separator.
4. The existing add-a-filter field list, unchanged in structure. Selecting a field here always **adds a new filter instance** (current `allowMultiple` semantics preserved). The active section rows and field rows share one keyboard-highlight index space so ArrowUp/Down walks through both, and ArrowRight/Enter opens the highlighted row's submenu.
5. **Clear filters** item at the bottom (after a separator), only when at least one filter exists. Clicking it calls `onChange([])` and closes the menu.

The active section is filtered by the search input the same way field rows are (match on field label), so searching doesn't strand unmatchable rows.

### Edit submenu (one per active filter instance)

Top to bottom:

1. **Operator row**: a compact row displaying the current operator label. Activating it swaps the submenu content to an operator list (the same operators `getOperatorsForField` returns today, checkmark on the current one). Picking one calls `updateFilter(id, { operator })` and swaps back to the value view. Switching to `empty`/`not_empty` clears `values` (same rule as inline mode).
2. **Value editor** (hidden when operator is `empty`/`not_empty`):
   - select/multiselect: the existing `FilterOptionsList`, bound to this filter's `values`; toggling edits the live filter. Single-select keeps its "pick and collapse" behavior; multiselect stays open.
   - text/number: a debounced input reusing the `TextFilterValue` commit logic (300 ms debounce, Enter/blur flush), styled to sit inside the menu surface.
   - `custom` fields: render `customRenderer` inside the submenu, same props as inline mode.
3. Separator, then a destructive **Remove filter** item calling `removeFilter(id)`.

Keyboard: ArrowLeft collapses back to the root menu (matching `FilterOptionsList`'s existing `onBack`), Escape closes the whole menu.

### Add flow for fields without option submenus

Today, selecting a text/number field adds a chip with an autofocused input. In compact mode there is no chip, so:

- In compact mode, text/number/custom fields in the add list render as submenus containing the same operator row + value editor as the edit submenu. The filter instance is created on the first value commit (mirroring how multiselect submenus create a session filter on first toggle). Until a value is committed, nothing is added.
- Select/multiselect add submenus are unchanged (toggle values, session filter created on first toggle) — after adding, the filter appears in the Active section the next time the menu opens (and immediately, since the menu content is live).

### DataTableToolbar interaction

- The toolbar's external "Clear" button behavior is unchanged (clears search + filters). It remains useful in compact mode for search; the in-menu "Clear filters" item only clears filters.

## Implementation shape

All changes live in `filters.tsx` plus the one-prop passthrough in `data-table-toolbar.tsx`:

- The compact root menu reuses the existing dropdown state (`addFilterOpen`, `menuSearchInput`, `highlightedIndex`, `openSubMenu`, `activeMenu`, session filter tracking).
- New internal pieces: `FilterTriggerBadge`, an `ActiveFilterRow`/edit-submenu component (operator view toggle + value editor + remove), and a value-summary formatter. The operator list reuses the data from `getOperatorsForField`; the value editors reuse `FilterOptionsList` and the `TextFilterValue` debounce pattern.
- Chip components (`ButtonGroup` row, `FilterFieldLabel`, `FilterOperatorDropdown`, `FilterValueSelector`, `FilterRemoveButton`) simply don't render when `display === "compact"`.

## Adoption

- Switch the property page units table to `filterDisplay="compact"` via its `DataTableToolbar` usage.
- Full-width tables (e.g. properties list) stay on the default inline mode.

## Testing

- Manual verification in the units table (narrow layout) and a full-width table (regression on inline mode): add/edit/remove filters of each type (select, multiselect, text, number with prefix, empty/not_empty operators), badge count, clear-all, `F` shortcut, keyboard navigation through active rows + field rows, async `loadOptions` fields.
- Type-check and lint via Turbo.
