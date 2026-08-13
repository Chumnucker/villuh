"use client"
"use no memo"

import type React from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { cva } from "class-variance-authority"

import { cn } from "../utils"
import { Button } from "./button"
import {
  ButtonGroup,
  ButtonGroupText,
} from "./button-group"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu"
import { Input } from "./input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "./input-group"
import { Kbd } from "./kbd"
import { ScrollArea } from "./scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip"
import { AlertCircleIcon, XIcon, CheckIcon, ChevronDownIcon } from "lucide-react"
import { PlatformIcon } from "./icon"

// i18n Configuration Interface
export interface FilterI18nConfig {
  // UI Labels
  addFilter: string
  searchFields: string
  noFieldsFound: string
  noResultsFound: string
  select: string
  true: string
  false: string
  min: string
  max: string
  to: string
  typeAndPressEnter: string
  selected: string
  selectedCount: string
  percent: string
  defaultCurrency: string
  defaultColor: string
  addFilterTitle: string
  // Async option loading states (optional; fall back to sensible defaults)
  loadingOptions?: string
  errorLoadingOptions?: string
  // Compact display mode labels (optional; fall back to sensible defaults)
  clearFilters?: string
  removeFilter?: string

  // Operators
  operators: {
    is: string
    isNot: string
    isAnyOf: string
    isNotAnyOf: string
    includesAll: string
    excludesAll: string
    before: string
    after: string
    between: string
    notBetween: string
    contains: string
    notContains: string
    startsWith: string
    endsWith: string
    isExactly: string
    equals: string
    notEquals: string
    greaterThan: string
    lessThan: string
    overlaps: string
    includes: string
    excludes: string
    includesAllOf: string
    includesAnyOf: string
    empty: string
    notEmpty: string
  }

  // Placeholders
  placeholders: {
    enterField: (fieldType: string) => string
    selectField: string
    searchField: (fieldName: string) => string
    enterKey: string
    enterValue: string
  }

  // Helper functions
  helpers: {
    formatOperator: (operator: string) => string
  }

  // Validation
  validation: {
    invalidEmail: string
    invalidUrl: string
    invalidTel: string
    invalid: string
  }
}

// Default English i18n configuration
export const DEFAULT_I18N: FilterI18nConfig = {
  // UI Labels
  addFilter: "Filter",
  searchFields: "Filter...",
  noFieldsFound: "No filters found.",
  noResultsFound: "No results found.",
  select: "Select...",
  true: "True",
  false: "False",
  min: "Min",
  max: "Max",
  to: "to",
  typeAndPressEnter: "Type and press Enter to add tag",
  selected: "selected",
  selectedCount: "selected",
  percent: "%",
  defaultCurrency: "$",
  defaultColor: "#000000",
  addFilterTitle: "Add filter",
  loadingOptions: "Loading...",
  errorLoadingOptions: "Failed to load options.",
  clearFilters: "Clear filters",
  removeFilter: "Remove filter",

  // Operators
  operators: {
    is: "is",
    isNot: "is not",
    isAnyOf: "is any of",
    isNotAnyOf: "is not any of",
    includesAll: "includes all",
    excludesAll: "excludes all",
    before: "before",
    after: "after",
    between: "between",
    notBetween: "not between",
    contains: "contains",
    notContains: "does not contain",
    startsWith: "starts with",
    endsWith: "ends with",
    isExactly: "is exactly",
    equals: "equals",
    notEquals: "not equals",
    greaterThan: "greater than",
    lessThan: "less than",
    overlaps: "overlaps",
    includes: "includes",
    excludes: "excludes",
    includesAllOf: "includes all of",
    includesAnyOf: "includes any of",
    empty: "is empty",
    notEmpty: "is not empty",
  },

  // Placeholders
  placeholders: {
    enterField: (fieldType: string) => `Enter ${fieldType}...`,
    selectField: "Select...",
    searchField: (fieldName: string) => `Search ${fieldName.toLowerCase()}...`,
    enterKey: "Enter key...",
    enterValue: "Enter value...",
  },

  // Helper functions
  helpers: {
    formatOperator: (operator: string) => operator.replace(/_/g, " "),
  },

  // Validation
  validation: {
    invalidEmail: "Invalid email format",
    invalidUrl: "Invalid URL format",
    invalidTel: "Invalid phone format",
    invalid: "Invalid input format",
  },
}

// Shared display config for every segment of a filter chip.
interface FilterContextValue {
  variant: "solid" | "default"
  size: "sm" | "default" | "lg"
  i18n: FilterI18nConfig
}

const FilterContext = createContext<FilterContextValue>({
  variant: "default",
  size: "default",
  i18n: DEFAULT_I18N,
})

/** Match SearchInput `rounded-xl` instead of button-group's pill `rounded-4xl`. */
const filterChipGroupClassName =
  "[&>[data-slot]:not(:has(~[data-slot]))]:rounded-r-xl!"

/** Solid input fill in light + dark (outline buttons default to `dark:bg-transparent`). */
const filterChipSurfaceClassName =
  "bg-input hover:bg-input/80 aria-expanded:bg-input/80 dark:bg-input dark:hover:bg-input/80 dark:aria-expanded:bg-input/80"

const filterChipLabelClassName = cn(
  "rounded-xl border-border bg-clip-padding",
  filterChipSurfaceClassName
)

const useFilterContext = () => useContext(FilterContext)

// Container variant for filters wrapper
const filtersContainerVariants = cva("flex flex-wrap items-center", {
  variants: {
    variant: {
      solid: "gap-2",
      default: "",
    },
    size: {
      sm: "gap-1.5",
      default: "gap-2.5",
      lg: "gap-3.5",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

function FilterInput<T = unknown>({
  field,
  onBlur,
  onKeyDown,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  className?: string
  field?: FilterFieldConfig<T>
}) {
  const context = useFilterContext()
  const [isValid, setIsValid] = useState(true)
  const [validationMessage, setValidationMessage] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (props.autoFocus) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [props.autoFocus])

  // Validation function to check if input matches pattern
  const validateInput = (value: string, pattern?: string): boolean => {
    if (!pattern || !value) return true
    const regex = new RegExp(pattern)
    return regex.test(value)
  }

  // Handle blur event - validate when user leaves input
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value
    const pattern = field?.pattern || props.pattern

    // Only validate if there's a value and (pattern or validation function)
    if (value && (pattern || field?.validation)) {
      let valid = true
      let customMessage = ""

      // If there's a custom validation function, use it
      if (field?.validation) {
        const result = field.validation(value)
        // Handle both boolean and object return types
        if (typeof result === "boolean") {
          valid = result
        } else {
          valid = result.valid
          customMessage = result.message || ""
        }
      } else if (pattern) {
        // Use pattern validation
        valid = validateInput(value, pattern)
      }

      setIsValid(valid)
      setValidationMessage(
        valid ? "" : customMessage || context.i18n.validation.invalid
      )
    } else {
      // Reset validation state for empty values or no validation
      setIsValid(true)
      setValidationMessage("")
    }

    // Call the original onBlur if provided
    onBlur?.(e)
  }

  // Handle keydown event - hide validation error when user starts typing
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Hide validation error when user starts typing (any key except special keys)
    if (
      !isValid &&
      ![
        "Tab",
        "Escape",
        "Enter",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.key)
    ) {
      setIsValid(true)
      setValidationMessage("")
    }

    // Call the original onKeyDown if provided
    onKeyDown?.(e)
  }

  return (
    <InputGroup
      className={cn(
        "w-36",
        // Match the Button control ladder (h-8 sm / h-9 default / h-10 lg);
        // `default` inherits the input-group's own h-9.
        context.size == "sm" && "h-8!",
        context.size == "lg" && "h-10!",
        className
      )}
    >
      {field?.prefix && (
        <InputGroupAddon>
          <InputGroupText>{field.prefix}</InputGroupText>
        </InputGroupAddon>
      )}
      <InputGroupInput
        ref={inputRef}
        aria-invalid={!isValid}
        aria-describedby={
          !isValid && validationMessage
            ? `${field?.key || "input"}-error`
            : undefined
        }
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          context.size == "sm" && "h-8! text-xs",
          context.size == "lg" && "h-10!"
        )}
        {...props}
      />
      {!isValid && validationMessage && (
        <InputGroupAddon align="inline-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InputGroupButton size="icon-xs">
                  <AlertCircleIcon className="text-destructive size-3.5" />
                </InputGroupButton>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">{validationMessage}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </InputGroupAddon>
      )}

      {field?.suffix && (
        <InputGroupAddon align="inline-end">
          <InputGroupText>{field.suffix}</InputGroupText>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}

interface FilterRemoveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode
}

function FilterFieldLabel({
  icon,
  label,
}: {
  icon?: React.ReactNode
  label?: string
}) {
  const context = useFilterContext()

  return (
    <Button
      type="button"
      variant="outline"
      size={context.size}
      tabIndex={-1}
      className={cn(
        filterChipSurfaceClassName,
        "pointer-events-none gap-2 font-medium"
      )}
    >
      {icon}
      {label}
    </Button>
  )
}

function FilterRemoveButton({
  className,
  icon = (
    <XIcon
    />
  ),
  ...props
}: FilterRemoveButtonProps) {
  const context = useFilterContext()

  return (
    <Button
      variant="outline"
      size={
        context.size === "sm"
          ? "icon-sm"
          : context.size === "lg"
            ? "icon-lg"
            : "icon"
      }
      className={cn(
        filterChipSurfaceClassName,
        "text-muted-foreground hover:text-destructive hover:bg-destructive/20 aria-expanded:bg-input dark:hover:bg-destructive/30 dark:hover:text-destructive",
        className
      )}
      {...props}
    >
      {icon}
    </Button>
  )
}

// Generic types for flexible filter system
export interface FilterOption<T = unknown> {
  value: T
  label: string
  icon?: React.ReactNode
  metadata?: Record<string, unknown>
  className?: string
}

export interface FilterOperator {
  value: string
  label: string
  supportsMultiple?: boolean
}

// Custom renderer props interface
export interface CustomRendererProps<T = unknown> {
  field: FilterFieldConfig<T>
  values: T[]
  onChange: (values: T[]) => void
  operator: string
}

// Props passed to a field's `renderOptionList` slot. Lets a consumer render the
// options list however they like (e.g. windowing / virtualization with a
// library of their choice) while staying bound to the primitive's selection and
// keyboard behavior.
export interface FilterOptionListRenderProps<T = unknown> {
  // Options to render: already resolved, query-filtered, and selected-first.
  options: FilterOption<T>[]
  // Index into `options` of the keyboard-highlighted row (-1 if none). A
  // virtualized implementation should scroll this row into view and keep it
  // mounted so the combobox's aria-activedescendant stays valid.
  highlightedIndex: number
  // Renders one option row with the correct id, selection state, highlight, and
  // toggle handler wired to the primitive. Call it for each row you render.
  renderOption: (option: FilterOption<T>, index: number) => React.ReactNode
}

// Grouped field configuration interface
export interface FilterFieldGroup<T = unknown> {
  group?: string
  fields: FilterFieldConfig<T>[]
}

// Union type for both flat and grouped field configurations
export type FilterFieldsConfig<T = unknown> =
  | FilterFieldConfig<T>[]
  | FilterFieldGroup<T>[]

export interface FilterFieldConfig<T = unknown> {
  key?: string
  label?: string
  icon?: React.ReactNode
  type?: "select" | "multiselect" | "text" | "custom" | "separator"
  // Group-level configuration
  group?: string
  fields?: FilterFieldConfig<T>[]
  // Field-specific options
  options?: FilterOption<T>[]
  // Async / large-list options loader. Receives the current search query and
  // may return a Promise. Use it to prefetch a remote list once (ignore the
  // query) or to run server-side search (filter by the query). When both
  // `options` and `loadOptions` are provided, `options` seeds the initial view
  // and the value->label cache while `loadOptions` supplies live results.
  loadOptions?: (
    query: string
  ) => FilterOption<T>[] | Promise<FilterOption<T>[]>
  // Bring-your-own rendering for the options list (e.g. virtualization with a
  // windowing library of your choice). Return the full scrollable list, call
  // `renderOption` for each row, and scroll `highlightedIndex` into view. When
  // omitted, the options render as a plain scrollable list.
  renderOptionList?: (props: FilterOptionListRenderProps<T>) => React.ReactNode
  operators?: FilterOperator[]
  customRenderer?: (props: CustomRendererProps<T>) => React.ReactNode
  customValueRenderer?: (
    values: T[],
    options: FilterOption<T>[]
  ) => React.ReactNode
  placeholder?: string
  searchable?: boolean
  maxSelections?: number
  min?: number
  max?: number
  step?: number
  /** Passed through to the text FilterInput (e.g. `"number"`). */
  inputType?: React.HTMLInputTypeAttribute
  prefix?: string | React.ReactNode
  suffix?: string | React.ReactNode
  pattern?: string
  validation?: (
    value: unknown
  ) => boolean | { valid: boolean; message?: string }
  allowCustomValues?: boolean
  className?: string
  menuPopupClassName?: string
  // Grouping options (legacy support)
  groupLabel?: string
  // Boolean field options
  onLabel?: string
  offLabel?: string
  // Input event handlers
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  // Default operator to use when creating a filter for this field
  defaultOperator?: string
  /**
   * How this field maps into a server list query.
   * Used by `buildDataTableServerInput` so pages don't hand-wire each filter.
   */
  server?: FilterServerMapping
  // Controlled values support for this field
  value?: T[]
  onValueChange?: (values: T[]) => void
}

/** Declares how a filter field serializes into tRPC / API list input. */
export type FilterServerMapping =
  | {
      kind: "ids"
      /** Include list param, e.g. `propertyIds`. */
      param: string
      /** Exclude list param for `is_not_any_of`, e.g. `excludeStatusIds`. */
      excludeParam?: string
      /** Boolean param for empty / not_empty (`true` = empty). */
      emptyParam?: string
    }
  | {
      kind: "numeric"
      /** Predicates array param, e.g. `baseRentCents`. */
      param: string
      /** Boolean param for empty / not_empty on nullable numerics. */
      emptyParam?: string
      /** e.g. dollars → cents */
      transform?: (value: number) => number
    }

// Helper functions to handle both flat and grouped field configurations
const isFieldGroup = <T = unknown,>(
  item: FilterFieldConfig<T> | FilterFieldGroup<T>
): item is FilterFieldGroup<T> => {
  return "fields" in item && Array.isArray(item.fields)
}

// Helper function to check if a FilterFieldConfig is a group-level configuration
const isGroupLevelField = <T = unknown,>(
  field: FilterFieldConfig<T>
): boolean => {
  return Boolean(field.group && field.fields)
}

const flattenFields = <T = unknown,>(
  fields: FilterFieldsConfig<T>
): FilterFieldConfig<T>[] => {
  return fields.reduce<FilterFieldConfig<T>[]>((acc, item) => {
    if (isFieldGroup(item)) {
      return [...acc, ...item.fields]
    }
    // Handle group-level fields (new structure)
    if (isGroupLevelField(item)) {
      return [...acc, ...item.fields!]
    }
    return [...acc, item]
  }, [])
}

const getFieldsMap = <T = unknown,>(
  fields: FilterFieldsConfig<T>
): Record<string, FilterFieldConfig<T>> => {
  const flatFields = flattenFields(fields)
  return flatFields.reduce(
    (acc, field) => {
      // Only add fields that have a key (skip group-level configurations)
      if (field.key) {
        acc[field.key] = field
      }
      return acc
    },
    {} as Record<string, FilterFieldConfig<T>>
  )
}

// Whether a field exposes any option source (a static list or an async loader).
// IMPORTANT: never gate on `field.options?.length` once `loadOptions` exists —
// a function's `.length` is its arity, not an option count, which silently
// breaks the submenu gate for async fields.
const fieldHasOptions = <T = unknown,>(field: FilterFieldConfig<T>): boolean =>
  (field.options?.length ?? 0) > 0 || typeof field.loadOptions === "function"

interface ResolvedFieldOptions<T = unknown> {
  isAsync: boolean
  options: FilterOption<T>[]
  loading: boolean
  error: boolean
}

// Value->option cache shared across every component instance rendering the
// SAME field object (the Add Filter submenu and the active-filter chip both
// receive the same config reference from the fields map). Keyed by the field
// object so it is shared when fields are memoized and garbage-collected
// otherwise. This keeps a value selected in the submenu labelled in the chip.
const fieldOptionCaches = new WeakMap<object, Map<unknown, FilterOption>>()

const getFieldOptionCache = <T = unknown,>(
  field: FilterFieldConfig<T>
): Map<T, FilterOption<T>> => {
  let cache = fieldOptionCaches.get(field as object)
  if (!cache) {
    cache = new Map()
    fieldOptionCaches.set(field as object, cache)
  }
  return cache as Map<T, FilterOption<T>>
}

// Resolves a field's options for a popover/submenu. Static fields return their
// list verbatim (unchanged legacy behavior). Async fields (`loadOptions`)
// debounce the query, guard against out-of-order responses, and expose
// loading/error state plus a value->label cache.
function useFieldOptions<T = unknown>(
  field: FilterFieldConfig<T>,
  searchInput: string,
  enabled: boolean
): ResolvedFieldOptions<T> {
  const isAsync = typeof field.loadOptions === "function"

  // Seed the shared cache from any static options an async field also provides
  // (static fields never read this cache, so skip the work for them).
  if (isAsync && field.options) {
    const cache = getFieldOptionCache(field)
    for (const opt of field.options) {
      cache.set(opt.value, opt)
    }
  }

  const [state, setState] = useState<{
    options: FilterOption<T>[]
    loading: boolean
    error: boolean
  }>(() => ({ options: field.options ?? [], loading: false, error: false }))

  // Debounce the query for async fields to avoid a request per keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState(searchInput)
  useEffect(() => {
    if (!isAsync) return
    const timer = setTimeout(() => setDebouncedQuery(searchInput), 250)
    return () => clearTimeout(timer)
  }, [searchInput, isAsync])

  const requestIdRef = useRef(0)
  // Keep the latest loader in a ref so an unmemoized `loadOptions` identity does
  // not cancel and refire the in-flight request on every parent re-render.
  const loaderRef = useRef(field.loadOptions)
  loaderRef.current = field.loadOptions
  useEffect(() => {
    if (!isAsync || !enabled) return
    const loader = loaderRef.current
    if (!loader) return

    const requestId = ++requestIdRef.current
    let cancelled = false
    setState((prev) => ({ ...prev, loading: true, error: false }))

    Promise.resolve()
      .then(() => loader(debouncedQuery))
      .then((result) => {
        // Ignore stale responses (out-of-order guard).
        if (cancelled || requestId !== requestIdRef.current) return
        const cache = getFieldOptionCache(field)
        for (const opt of result) cache.set(opt.value, opt)
        setState({ options: result, loading: false, error: false })
      })
      .catch(() => {
        if (cancelled || requestId !== requestIdRef.current) return
        setState((prev) => ({ ...prev, loading: false, error: true }))
      })

    return () => {
      cancelled = true
    }
  }, [isAsync, enabled, debouncedQuery])

  if (!isAsync) {
    return {
      isAsync: false,
      options: field.options ?? [],
      loading: false,
      error: false,
    }
  }

  return {
    isAsync: true,
    options: state.options,
    loading: state.loading,
    error: state.error,
  }
}

// Helper function to create operators from i18n config
const createOperatorsFromI18n = (
  i18n: FilterI18nConfig
): Record<string, FilterOperator[]> => ({
  select: [
    { value: "is", label: i18n.operators.is },
    { value: "is_not", label: i18n.operators.isNot },
    { value: "empty", label: i18n.operators.empty },
    { value: "not_empty", label: i18n.operators.notEmpty },
  ],
  multiselect: [
    { value: "is_any_of", label: i18n.operators.isAnyOf },
    { value: "is_not_any_of", label: i18n.operators.isNotAnyOf },
    { value: "includes_all", label: i18n.operators.includesAll },
    { value: "excludes_all", label: i18n.operators.excludesAll },
    { value: "empty", label: i18n.operators.empty },
    { value: "not_empty", label: i18n.operators.notEmpty },
  ],
  text: [
    { value: "contains", label: i18n.operators.contains },
    { value: "not_contains", label: i18n.operators.notContains },
    { value: "starts_with", label: i18n.operators.startsWith },
    { value: "ends_with", label: i18n.operators.endsWith },
    { value: "is", label: i18n.operators.isExactly },
    { value: "empty", label: i18n.operators.empty },
    { value: "not_empty", label: i18n.operators.notEmpty },
  ],
  custom: [
    { value: "is", label: i18n.operators.is },
    { value: "after", label: i18n.operators.after },
    { value: "between", label: i18n.operators.between },
    { value: "empty", label: i18n.operators.empty },
    { value: "not_empty", label: i18n.operators.notEmpty },
  ],
})

// Default operators for different field types (using default i18n)
export const DEFAULT_OPERATORS: Record<string, FilterOperator[]> =
  createOperatorsFromI18n(DEFAULT_I18N)

// Helper function to get operators for a field
const getOperatorsForField = <T = unknown,>(
  field: FilterFieldConfig<T>,
  values: T[],
  i18n: FilterI18nConfig
): FilterOperator[] => {
  if (field.operators) return field.operators

  const operators = createOperatorsFromI18n(i18n)

  // Determine field type for operator selection
  let fieldType = field.type || "select"

  // If it's a select field but has multiple values, treat as multiselect
  if (fieldType === "select" && values.length > 1) {
    fieldType = "multiselect"
  }

  // If it's a multiselect field or has multiselect operators, use multiselect operators
  if (fieldType === "multiselect" || field.type === "multiselect") {
    return operators.multiselect
  }

  return operators[fieldType] || operators.select
}

interface FilterOperatorDropdownProps<T = unknown> {
  field: FilterFieldConfig<T>
  operator: string
  values: T[]
  onChange: (operator: string) => void
}

function FilterOperatorDropdown<T = unknown>({
  field,
  operator,
  values,
  onChange,
}: FilterOperatorDropdownProps<T>) {
  const context = useFilterContext()
  const operators = useMemo(
    () => getOperatorsForField(field, values, context.i18n),
    [field, values, context.i18n]
  )

  // Find the operator label, with fallback to formatted operator name
  const operatorLabel =
    operators.find((op) => op.value === operator)?.label ||
    context.i18n.helpers.formatOperator(operator)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={context.size}
          className={cn(
            filterChipSurfaceClassName,
            "text-muted-foreground hover:text-foreground"
          )}
        >
          {operatorLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-fit min-w-fit">
        {operators.map((op) => (
          <DropdownMenuItem
            key={op.value}
            onClick={() => onChange(op.value)}
            className={cn(
              "data-highlighted:bg-accent data-highlighted:text-accent-foreground flex items-center justify-between"
            )}
          >
            <span>{op.label}</span>
            <CheckIcon className={cn(
                                "text-primary ms-auto",
                                op.value === operator ? "opacity-100" : "opacity-0"
                              )} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface FilterValueSelectorProps<T = unknown> {
  field: FilterFieldConfig<T>
  values: T[]
  onChange: (values: T[]) => void
  operator: string
  autoFocus?: boolean
}

// Resolve full options for a set of selected values. Static fields read their
// list directly; async fields fall back to the accumulated value->option cache
// so selections keep their label and icon between result pages.
const resolveSelectedOptions = <T = unknown,>(
  field: FilterFieldConfig<T>,
  values: T[]
): FilterOption<T>[] => {
  if (typeof field.loadOptions !== "function") {
    return (field.options ?? []).filter((opt) => values.includes(opt.value))
  }
  const cache = getFieldOptionCache(field)
  return values.map(
    (value) => cache.get(value) ?? { value, label: String(value) }
  )
}

interface FilterOptionsListProps<T = unknown> {
  field: FilterFieldConfig<T>
  selectedValues: T[]
  isMultiSelect: boolean
  onToggle: (option: FilterOption<T>, isSelected: boolean) => void
  /** Gate async option loading until the surface is actually visible. */
  enabled?: boolean
  /** Highlight the first row when this list becomes the active menu. */
  isActive?: boolean
  onActive?: () => void
  /** ArrowLeft — collapse back to the parent menu / close the popover. */
  onBack?: () => void
  /** Escape — dismiss the whole menu. */
  onClose?: () => void
}

/**
 * Searchable option list shared by the value-chip popover and the Add Filter
 * submenu: one implementation of search, async loading, keyboard navigation,
 * and option rendering.
 */
function FilterOptionsList<T = unknown>({
  field,
  selectedValues,
  isMultiSelect,
  onToggle,
  enabled = true,
  isActive = false,
  onActive,
  onBack,
  onClose,
}: FilterOptionsListProps<T>) {
  const context = useFilterContext()
  const [searchInput, setSearchInput] = useState("")
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const baseId = useId()

  const {
    isAsync,
    options: resolvedOptions,
    loading,
    error,
  } = useFieldOptions(field, searchInput, enabled)

  // Options keep their natural order — selection only toggles the checkmark.
  // Async loaders already query-filter; static options filter locally.
  const allOptions = isAsync
    ? resolvedOptions
    : (field.options ?? []).filter(
        (option) =>
          !searchInput ||
          option.label.toLowerCase().includes(searchInput.toLowerCase())
      )

  useEffect(() => {
    setHighlightedIndex(-1)
  }, [searchInput])

  useEffect(() => {
    if (isActive && allOptions.length > 0) {
      setHighlightedIndex(0)
    }
  }, [isActive, allOptions.length])

  useEffect(() => {
    if (highlightedIndex >= 0) {
      const element = document.getElementById(
        `${baseId}-item-${highlightedIndex}`
      )
      element?.scrollIntoView({ block: "nearest" })
    }
  }, [highlightedIndex, baseId])

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (allOptions.length > 0) {
        setHighlightedIndex((prev) =>
          prev < allOptions.length - 1 ? prev + 1 : 0
        )
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (allOptions.length > 0) {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : allOptions.length - 1
        )
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      onBack?.()
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault()
      const option = allOptions[highlightedIndex]
      if (option) {
        onToggle(option, selectedValues.includes(option.value))
        if (!isMultiSelect) onBack?.()
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      onClose?.()
    }
    e.stopPropagation()
  }

  const renderOptionItem = (option: FilterOption<T>, index: number) => {
    const isSelected = selectedValues.includes(option.value)
    const isHighlighted = highlightedIndex === index
    const itemId = `${baseId}-item-${index}`

    return (
      <DropdownMenuCheckboxItem
        key={String(option.value)}
        id={itemId}
        role="option"
        aria-selected={isHighlighted}
        data-highlighted={isHighlighted || undefined}
        onMouseEnter={() => setHighlightedIndex(index)}
        checked={isSelected}
        className={cn(
          "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
          option.className
        )}
        onSelect={(e) => {
          if (isMultiSelect) e.preventDefault()
        }}
        onCheckedChange={() => onToggle(option, isSelected)}
      >
        {option.icon && option.icon}
        <span className="truncate">{option.label}</span>
      </DropdownMenuCheckboxItem>
    )
  }

  return (
    <div className="flex flex-col" onMouseEnter={onActive}>
      {field.searchable !== false && (
        <>
          <Input
            ref={inputRef}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={true}
            aria-haspopup="listbox"
            aria-controls={`${baseId}-listbox`}
            aria-activedescendant={
              highlightedIndex >= 0
                ? `${baseId}-item-${highlightedIndex}`
                : undefined
            }
            placeholder={context.i18n.placeholders.searchField(
              field.label || ""
            )}
            className={cn(
              "h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none",
              "focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0"
            )}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleListKeyDown}
          />
          <DropdownMenuSeparator className="mx-0" />
        </>
      )}
      <div className="relative flex max-h-full">
        <div
          className="flex max-h-[min(var(--radix-dropdown-menu-content-available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain outline-hidden"
          role="listbox"
          id={`${baseId}-listbox`}
          tabIndex={field.searchable === false ? 0 : -1}
          onKeyDown={field.searchable === false ? handleListKeyDown : undefined}
        >
          {isAsync && loading && allOptions.length === 0 ? (
            <div className="text-muted-foreground py-2 text-center text-sm">
              {context.i18n.loadingOptions ?? DEFAULT_I18N.loadingOptions}
            </div>
          ) : isAsync && error ? (
            <div className="text-muted-foreground py-2 text-center text-sm">
              {context.i18n.errorLoadingOptions ??
                DEFAULT_I18N.errorLoadingOptions}
            </div>
          ) : allOptions.length === 0 ? (
            <div className="text-muted-foreground py-2 text-center text-sm">
              {context.i18n.noResultsFound}
            </div>
          ) : field.renderOptionList ? (
            field.renderOptionList({
              options: allOptions,
              highlightedIndex,
              renderOption: renderOptionItem,
            })
          ) : (
            <ScrollArea className="size-full min-h-0 **:data-[slot=scroll-area-scrollbar]:m-0 **:data-[slot=scroll-area-viewport]:h-full **:data-[slot=scroll-area-viewport]:overscroll-contain">
              {/* The menu surface is px-0 so the search input above spans
                  edge-to-edge; rows re-add the standard inset here, inside
                  the viewport so the scrollbar hugs the true edge. */}
              <DropdownMenuGroup className="px-1.5">
                {allOptions.map((option, index) =>
                  renderOptionItem(option, index)
                )}
              </DropdownMenuGroup>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  )
}

interface SelectOptionsPopoverProps<T = unknown> {
  field: FilterFieldConfig<T>
  values: T[]
  onChange: (values: T[]) => void
}

/** Value segment of a filter chip: trigger button opening the option list. */
function SelectOptionsPopover<T = unknown>({
  field,
  values,
  onChange,
}: SelectOptionsPopoverProps<T>) {
  const [open, setOpen] = useState(false)
  const context = useFilterContext()

  const isMultiSelect = field.type === "multiselect" || values.length > 1
  const effectiveValues =
    (field.value !== undefined ? (field.value as T[]) : values) || []
  const selectedOptions = resolveSelectedOptions(field, effectiveValues)

  const toggleOption = (option: FilterOption<T>, isSelected: boolean) => {
    const next = isSelected
      ? effectiveValues.filter((v) => v !== option.value)
      : isMultiSelect
        ? [...effectiveValues, option.value]
        : [option.value]

    if (
      !isSelected &&
      isMultiSelect &&
      field.maxSelections &&
      next.length > field.maxSelections
    ) {
      return
    }

    if (field.onValueChange) {
      field.onValueChange(next)
    } else {
      onChange(next)
    }
    if (!isMultiSelect) setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={context.size}
          className={filterChipSurfaceClassName}
        >
          <div className="flex items-center gap-1.5">
            {field.customValueRenderer ? (
              field.customValueRenderer(
                values,
                typeof field.loadOptions === "function"
                  ? resolveSelectedOptions(field, values)
                  : field.options || []
              )
            ) : (
              <>
                {selectedOptions.length > 0 && (
                  <div className="flex items-center -space-x-1.5">
                    {selectedOptions.slice(0, 3).map((option) => (
                      <div key={String(option.value)}>{option.icon}</div>
                    ))}
                  </div>
                )}
                {selectedOptions.length === 1
                  ? selectedOptions[0].label
                  : selectedOptions.length > 1
                    ? `${selectedOptions.length} ${context.i18n.selectedCount}`
                    : context.i18n.select}
              </>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn("w-[200px] px-0", field.className)}
      >
        <FilterOptionsList<T>
          field={field}
          selectedValues={effectiveValues}
          isMultiSelect={isMultiSelect}
          onToggle={toggleOption}
          enabled={open}
          onBack={() => setOpen(false)}
          onClose={() => setOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Matches the DataTable toolbar search debounce. */
const FILTER_VALUE_DEBOUNCE_MS = 300

/**
 * Text/number filter value with a debounced commit, so typing doesn't fire a
 * request per keystroke. Enter and blur flush the pending value immediately.
 */
function TextFilterValue<T = unknown>({
  field,
  values,
  onChange,
  autoFocus,
}: {
  field: FilterFieldConfig<T>
  values: T[]
  onChange: (values: T[]) => void
  autoFocus?: boolean
}) {
  const committed = (values[0] as string) || ""
  const [draft, setDraft] = useState(committed)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  // Last value we committed ourselves — lets the sync effect tell our own
  // commit echoing back through props apart from an external reset.
  const lastCommittedRef = useRef(committed)

  const commitValue = (value: string) => {
    lastCommittedRef.current = value
    onChangeRef.current([value] as T[])
  }

  // External changes (clear all, operator switch) override the draft. Our own
  // debounced commit echoing back must not — the user may already be typing
  // the next characters.
  useEffect(() => {
    if (committed === lastCommittedRef.current) return
    lastCommittedRef.current = committed
    setDraft(committed)
  }, [committed])

  useEffect(() => {
    if (draft === committed) return
    const timer = setTimeout(() => {
      lastCommittedRef.current = draft
      onChangeRef.current([draft] as T[])
    }, FILTER_VALUE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft, committed])

  return (
    <FilterInput
      type={field.inputType ?? "text"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== committed) commitValue(draft)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && draft !== committed) commitValue(draft)
      }}
      placeholder={field.placeholder}
      pattern={field.pattern}
      field={field}
      className={cn("w-36", field.className)}
      autoFocus={autoFocus}
      min={field.min}
      max={field.max}
      step={field.step}
    />
  )
}

function FilterValueSelector<T = unknown>({
  field,
  values,
  onChange,
  operator,
  autoFocus,
}: FilterValueSelectorProps<T>) {
  if (operator === "empty" || operator === "not_empty") {
    return null
  }

  if (field.customRenderer) {
    return (
      <ButtonGroupText
        className={cn(
          filterChipLabelClassName,
          "text-start whitespace-nowrap outline-hidden"
        )}
      >
        {field.customRenderer({ field, values, onChange, operator })}
      </ButtonGroupText>
    )
  }

  if (field.type === "text") {
    return (
      <TextFilterValue
        field={field}
        values={values}
        onChange={onChange}
        autoFocus={autoFocus}
      />
    )
  }

  // select / multiselect / everything else defaults to the options popover.
  return (
    <SelectOptionsPopover field={field} values={values} onChange={onChange} />
  )
}

/**
 * Value editors inside a compact submenu (text inputs, customRenderer
 * output) sit inside a Radix `DropdownMenuSubContent`, which otherwise
 * treats their keystrokes as menu input: printable keys feed typeahead and
 * ArrowLeft collapses the submenu. Stop those keys from propagating past the
 * editor — mirroring the `FilterOptionsList` search input and the root menu
 * input elsewhere in this file — but never swallow Escape, which must keep
 * bubbling so it still closes the whole menu.
 */
const stopSubmenuEditorKeyPropagation = (e: React.KeyboardEvent) => {
  if (e.key !== "Escape") {
    e.stopPropagation()
  }
}

interface CompactFieldSubmenuContentProps<T = unknown> {
  field: FilterFieldConfig<T>
  /** The field's live filter (first match in `filters`), or null when none exists yet. */
  filter: Filter<T> | null
  /** Create-or-update-or-retract the field's filter. */
  onCommit: (operator: string, values: T[]) => void
  /** Remove the field's filter (only called when `filter` exists). */
  onRemove: () => void
  /** Collapse back to the root menu (ArrowLeft / single-select pick). */
  onBack: () => void
  /** Close the whole dropdown (Escape). */
  onCloseMenu: () => void
  /** Gate async option loading until the submenu is open. */
  enabled: boolean
}

/**
 * Unified compact-mode field submenu: operator row (toggles to an inline
 * operator list) at the top, a value editor bound to the field's live
 * filter, and — when a filter already exists — a destructive remove item.
 * This is the edit surface for every keyed field in compact mode: option
 * fields, text fields, and custom-rendered fields.
 */
function CompactFieldSubmenuContent<T = unknown>({
  field,
  filter,
  onCommit,
  onRemove,
  onBack,
  onCloseMenu,
  enabled,
}: CompactFieldSubmenuContentProps<T>) {
  const context = useFilterContext()
  const [operator, setOperator] = useState(
    () =>
      filter?.operator ??
      field.defaultOperator ??
      (field.type === "multiselect" ? "is_any_of" : "is")
  )
  const [showOperators, setShowOperators] = useState(false)

  const currentValues = useMemo(() => filter?.values ?? [], [filter])

  const operators = useMemo(
    () => getOperatorsForField(field, currentValues, context.i18n),
    [field, currentValues, context.i18n]
  )
  const operatorLabel =
    operators.find((op) => op.value === operator)?.label ??
    context.i18n.helpers.formatOperator(operator)
  const hideValueEditor = operator === "empty" || operator === "not_empty"

  const isMultiSelect =
    field.type === "multiselect" || currentValues.length > 1

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
                // onCommit handles every case (create, update, retract on
                // empty draft, no-op) — always commit here so an operator
                // switch never leaves a stale filter behind.
                onCommit(op.value, currentValues)
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
      ) : hideValueEditor ? null : field.customRenderer ? (
        <div
          className="px-2 py-1.5"
          onKeyDown={stopSubmenuEditorKeyPropagation}
        >
          {field.customRenderer({
            field,
            values: currentValues,
            onChange: (values) => onCommit(operator, values),
            operator,
          })}
        </div>
      ) : field.type === "text" ? (
        <div
          className="p-1.5 [&_[data-slot=input-group]]:w-full"
          onKeyDown={stopSubmenuEditorKeyPropagation}
        >
          <TextFilterValue
            field={field}
            values={currentValues}
            onChange={(values) => onCommit(operator, values)}
            autoFocus
          />
        </div>
      ) : (
        <FilterOptionsList<T>
          field={field}
          selectedValues={currentValues}
          isMultiSelect={isMultiSelect}
          enabled={enabled}
          onBack={onBack}
          onClose={onCloseMenu}
          onToggle={(option, isSelected) => {
            const next = isSelected
              ? currentValues.filter((v) => v !== option.value)
              : isMultiSelect
                ? [...currentValues, option.value]
                : [option.value]
            onCommit(operator, next)
            if (!isMultiSelect) onBack()
          }}
        />
      )}

      {filter && !showOperators && (
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

export interface Filter<T = unknown> {
  id: string
  field: string
  operator: string
  values: T[]
}

interface FiltersProps<T = unknown> {
  filters: Filter<T>[]
  fields: FilterFieldsConfig<T>
  onChange: (filters: Filter<T>[]) => void
  className?: string
  variant?: "solid" | "default"
  size?: "sm" | "default" | "lg"
  i18n?: Partial<FilterI18nConfig>
  showSearchInput?: boolean
  trigger?: React.ReactNode
  allowMultiple?: boolean
  menuPopupClassName?: string
  enableShortcut?: boolean
  shortcutKey?: string
  shortcutLabel?: string
  /**
   * "inline" renders one chip per active filter next to the trigger (current
   * behavior). "compact" renders no chips: the trigger gets a count badge and
   * filters are managed inside the dropdown.
   */
  display?: "inline" | "compact"
}

export function Filters<T = unknown>({
  filters,
  fields,
  onChange,
  className,
  variant = "default",
  size = "default",
  i18n,
  showSearchInput = true,
  trigger,
  allowMultiple = true,
  menuPopupClassName,
  enableShortcut = false,
  shortcutKey = "f",
  shortcutLabel = "F",
  display = "inline",
}: FiltersProps<T>) {
  const [addFilterOpen, setAddFilterOpen] = useState(false)
  const [menuSearchInput, setMenuSearchInput] = useState("")
  const [activeMenu, setActiveMenu] = useState<string>("root")
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [lastAddedFilterId, setLastAddedFilterId] = useState<string | null>(
    null
  )
  const rootInputRef = useRef<HTMLInputElement>(null)
  const rootId = useId()

  useEffect(() => {
    if (!enableShortcut) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === shortcutKey.toLowerCase() &&
        !addFilterOpen &&
        !(
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement
        )
      ) {
        e.preventDefault()
        setAddFilterOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [enableShortcut, shortcutKey, addFilterOpen])

  useEffect(() => {
    setHighlightedIndex(-1)
  }, [menuSearchInput])

  useEffect(() => {
    if (highlightedIndex >= 0 && addFilterOpen) {
      const element = document.getElementById(
        `${rootId}-item-${highlightedIndex}`
      )
      element?.scrollIntoView({ block: "nearest" })
    }
  }, [highlightedIndex, addFilterOpen, rootId])

  useEffect(() => {
    if (!addFilterOpen) {
      setOpenSubMenu(null)
    }
  }, [addFilterOpen])

  // Track which filter instance is being built in the current Add Filter menu session
  // Maps fieldKey -> unique filterId created during this open session
  const [sessionFilterIds, setSessionFilterIds] = useState<
    Record<string, string>
  >({})

  useEffect(() => {
    if (lastAddedFilterId) {
      const timer = setTimeout(() => {
        setLastAddedFilterId(null)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [lastAddedFilterId])

  const mergedI18n: FilterI18nConfig = useMemo(
    () => ({
      ...DEFAULT_I18N,
      ...i18n,
      operators: { ...DEFAULT_I18N.operators, ...i18n?.operators },
      placeholders: { ...DEFAULT_I18N.placeholders, ...i18n?.placeholders },
      validation: { ...DEFAULT_I18N.validation, ...i18n?.validation },
    }),
    [i18n]
  )

  const fieldsMap = useMemo(() => getFieldsMap(fields), [fields])

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<Filter<T>>) => {
      onChange(
        filters.map((filter) => {
          if (filter.id === filterId) {
            const updatedFilter = { ...filter, ...updates }
            if (
              updates.operator === "empty" ||
              updates.operator === "not_empty"
            ) {
              updatedFilter.values = [] as T[]
            }
            return updatedFilter
          }
          return filter
        })
      )
    },
    [filters, onChange]
  )

  const removeFilter = useCallback(
    (filterId: string) => {
      onChange(filters.filter((filter) => filter.id !== filterId))
    },
    [filters, onChange]
  )

  const addFilter = useCallback(
    (fieldKey: string) => {
      const field = fieldsMap[fieldKey]
      if (field && field.key) {
        const defaultOperator =
          field.defaultOperator ||
          (field.type === "multiselect" ? "is_any_of" : "is")
        const defaultValues: unknown[] = field.type === "text" ? [""] : []
        const newFilter = createFilter<T>(
          fieldKey,
          defaultOperator,
          defaultValues as T[]
        )
        setLastAddedFilterId(newFilter.id)
        onChange([...filters, newFilter])
        setAddFilterOpen(false)
        setMenuSearchInput("")
      }
    },
    [fieldsMap, filters, onChange]
  )

  // Compact edit flow: create, update, or retract the field's own filter
  // (bound by field key, not by add-flow session state).
  const commitFieldFilter = useCallback(
    (field: FilterFieldConfig<T>, operator: string, values: T[]) => {
      const fieldKey = field.key as string
      const existing = filters.find((f) => f.field === fieldKey) ?? null
      const isEmptyOp = operator === "empty" || operator === "not_empty"
      const hasValue = values.some((v) => String(v ?? "") !== "")

      if (existing) {
        if (!isEmptyOp && !hasValue) {
          onChange(filters.filter((f) => f.id !== existing.id))
        } else {
          onChange(
            filters.map((f) =>
              f.id === existing.id
                ? { ...f, operator, values: isEmptyOp ? ([] as T[]) : values }
                : f
            )
          )
        }
      } else if (isEmptyOp || hasValue) {
        onChange([...filters, createFilter<T>(fieldKey, operator, isEmptyOp ? ([] as T[]) : values)])
      }
    },
    [filters, onChange]
  )

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

  const selectableFields = useMemo(() => {
    const flatFields = flattenFields(fields)
    return flatFields.filter((field) => {
      if (!field.key || field.type === "separator") return false
      // Compact mode's field row IS the edit surface — a field with an
      // active filter must stay listed regardless of `allowMultiple`.
      if (display === "compact") return true
      if (allowMultiple) return true
      return !filters.some((filter) => filter.field === field.key)
    })
  }, [fields, filters, allowMultiple, display])

  const filteredFields = useMemo(() => {
    return selectableFields.filter(
      (f) =>
        !menuSearchInput ||
        f.label?.toLowerCase().includes(menuSearchInput.toLowerCase())
    )
  }, [selectableFields, menuSearchInput])

  const navigableCount = filteredFields.length

  useEffect(() => {
    if (addFilterOpen && navigableCount > 0) {
      setHighlightedIndex(0)
    }
  }, [addFilterOpen, navigableCount])

  const contextValue = useMemo<FilterContextValue>(
    () => ({ variant, size, i18n: mergedI18n }),
    [variant, size, mergedI18n]
  )

  const activeFilterCount = useMemo(
    () => filters.filter((filter) => Boolean(fieldsMap[filter.field])).length,
    [filters, fieldsMap]
  )

  const triggerNode = trigger || (
    <Button
      variant="outline"
      size={size === "sm" ? "icon-sm" : size === "lg" ? "icon-lg" : "icon"}
      className={filterChipSurfaceClassName}
    >
      <PlatformIcon icon="IconListBullets" size={16} />
    </Button>
  )

  return (
    <FilterContext.Provider value={contextValue}>
      <div
        className={cn(filtersContainerVariants({ variant, size }), className)}
      >
        {(selectableFields.length > 0 ||
          (display === "compact" && filters.length > 0)) && (
          <DropdownMenu
            open={addFilterOpen}
            onOpenChange={(open) => {
              setAddFilterOpen(open)
              if (!open) {
                setMenuSearchInput("")
                setSessionFilterIds({})
              } else {
                setActiveMenu("root")
              }
            }}
          >
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
            <DropdownMenuContent
              className={cn("w-[220px]", menuPopupClassName)}
              align="start"
            >
              {showSearchInput && (
                <>
                  <div className="relative">
                    <Input
                      ref={rootInputRef}
                      role="combobox"
                      aria-controls={`${rootId}-listbox`}
                      aria-activedescendant={
                        highlightedIndex >= 0
                          ? `${rootId}-item-${highlightedIndex}`
                          : undefined
                      }
                      placeholder={mergedI18n.searchFields}
                      className={cn(
                        "h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none",
                        "focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0"
                      )}
                      value={menuSearchInput}
                      onChange={(e) => setMenuSearchInput(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault()
                          if (navigableCount > 0) {
                            setHighlightedIndex((prev) =>
                              prev < navigableCount - 1 ? prev + 1 : 0
                            )
                          }
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault()
                          if (navigableCount > 0) {
                            setHighlightedIndex((prev) =>
                              prev > 0 ? prev - 1 : navigableCount - 1
                            )
                          }
                        } else if (
                          (e.key === "ArrowRight" || e.key === "ArrowLeft") &&
                          highlightedIndex >= 0
                        ) {
                          const field = filteredFields[highlightedIndex]
                          const opensSubmenu =
                            field && fieldOpensSubmenu(field)

                          if (e.key === "ArrowRight" && opensSubmenu) {
                            e.preventDefault()
                            setOpenSubMenu(field.key || null)
                            setActiveMenu(field.key || "root")
                          } else if (e.key === "ArrowLeft") {
                            e.preventDefault()
                            if (openSubMenu) {
                              setOpenSubMenu(null)
                              setActiveMenu("root")
                            }
                          }
                        } else if (e.key === "Enter" && highlightedIndex >= 0) {
                          e.preventDefault()
                          const field = filteredFields[highlightedIndex]
                          if (field.key) {
                            const opensSubmenu = fieldOpensSubmenu(field)
                            if (!opensSubmenu) {
                              addFilter(field.key)
                            } else {
                              if (openSubMenu === field.key) {
                                setOpenSubMenu(null)
                                setActiveMenu("root")
                              } else {
                                setOpenSubMenu(field.key)
                                setActiveMenu(field.key)
                              }
                            }
                          }
                        } else if (e.key === "Escape") {
                          setAddFilterOpen(false)
                        }
                        e.stopPropagation()
                      }}
                    />
                    {enableShortcut && shortcutLabel && (
                      <Kbd className="bg-background absolute top-1/2 right-2 -translate-y-1/2 border">
                        {shortcutLabel}
                      </Kbd>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}

              <div className="relative flex max-h-full">
                <div
                  className="flex max-h-[min(var(--radix-dropdown-menu-content-available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain"
                  role="listbox"
                  id={`${rootId}-listbox`}
                >
                  <ScrollArea className="**:data-[slot=scroll-area-scrollbar]:m-0">
                    {(() => {
                      if (filteredFields.length === 0) {
                        return (
                          <div className="text-muted-foreground py-2 text-center text-sm">
                            {mergedI18n.noFieldsFound}
                          </div>
                        )
                      }

                      return filteredFields.map((field, index) => {
                        const isHighlighted = highlightedIndex === index
                        const itemId = `${rootId}-item-${index}`
                        const hasSubMenu =
                          (field.type === "select" ||
                            field.type === "multiselect") &&
                          fieldHasOptions(field)
                        const opensSubmenu = fieldOpensSubmenu(field)
                        const fieldKey = field.key as string
                        const isFieldActive =
                          display === "compact" &&
                          filters.some((f) => f.field === fieldKey)
                        const activeDot = isFieldActive ? (
                          <span
                            aria-hidden
                            className="bg-primary ms-auto size-1.5 shrink-0 rounded-full"
                          />
                        ) : null

                        // Compact mode: every editable field (option, text,
                        // or customRenderer) renders as a unified edit
                        // submenu bound live to the field's own filter.
                        if (display === "compact" && opensSubmenu) {
                          const filterForField =
                            filters.find((f) => f.field === fieldKey) ?? null

                          return (
                            <DropdownMenuSub
                              key={fieldKey}
                              open={openSubMenu === fieldKey}
                              onOpenChange={(open) => {
                                if (open) {
                                  setOpenSubMenu((prev) =>
                                    prev === fieldKey ? prev : fieldKey
                                  )
                                  setActiveMenu(fieldKey)
                                } else if (openSubMenu === fieldKey) {
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
                                {field.icon}
                                <span>{field.label}</span>
                                {activeDot}
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="w-[220px] px-0">
                                <CompactFieldSubmenuContent<T>
                                  field={field}
                                  filter={filterForField}
                                  enabled={openSubMenu === fieldKey}
                                  onCommit={(operator, values) =>
                                    commitFieldFilter(field, operator, values)
                                  }
                                  onRemove={() => {
                                    if (filterForField) {
                                      removeFilter(filterForField.id)
                                    }
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
                        }

                        // Inline mode's option-field add flow: unchanged
                        // session-based submenu (`sessionFilterIds`).
                        if (display === "inline" && hasSubMenu) {
                          const isMultiSelect = field.type === "multiselect"
                          const sessionFilterId = sessionFilterIds[fieldKey]
                          const sessionFilter = sessionFilterId
                            ? filters.find((f) => f.id === sessionFilterId)
                            : null
                          const currentValues = sessionFilter?.values || []

                          return (
                            <DropdownMenuSub
                              key={fieldKey}
                              open={openSubMenu === fieldKey}
                              onOpenChange={(open) => {
                                if (open) {
                                  setOpenSubMenu((prev) =>
                                    prev === fieldKey ? prev : fieldKey
                                  )
                                } else {
                                  if (openSubMenu === fieldKey) {
                                    setOpenSubMenu(null)
                                    setActiveMenu("root")
                                  }
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
                                {field.icon}
                                <span>{field.label}</span>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="w-[200px] px-0">
                                <FilterOptionsList<T>
                                  field={field}
                                  selectedValues={currentValues}
                                  isMultiSelect={isMultiSelect}
                                  isActive={activeMenu === fieldKey}
                                  onActive={() => {
                                    if (field.searchable !== false) {
                                      setActiveMenu(fieldKey)
                                    }
                                  }}
                                  onBack={() => {
                                    setOpenSubMenu(null)
                                    setActiveMenu("root")
                                  }}
                                  onClose={() => setAddFilterOpen(false)}
                                  onToggle={(option, isSelected) => {
                                    const value = option.value
                                    if (isMultiSelect) {
                                      const nextValues = isSelected
                                        ? currentValues.filter(
                                            (v) => v !== value
                                          )
                                        : [...currentValues, value]

                                      if (sessionFilter) {
                                        if (nextValues.length === 0) {
                                          onChange(
                                            filters.filter(
                                              (f) => f.id !== sessionFilter.id
                                            )
                                          )
                                          setSessionFilterIds((prev) => {
                                            const next = { ...prev }
                                            delete next[fieldKey]
                                            return next
                                          })
                                        } else {
                                          onChange(
                                            filters.map((f) =>
                                              f.id === sessionFilter.id
                                                ? { ...f, values: nextValues }
                                                : f
                                            )
                                          )
                                        }
                                      } else {
                                        const newFilter = createFilter<T>(
                                          fieldKey,
                                          field.defaultOperator || "is_any_of",
                                          nextValues
                                        )
                                        onChange([...filters, newFilter])
                                        setSessionFilterIds((prev) => ({
                                          ...prev,
                                          [fieldKey]: newFilter.id,
                                        }))
                                      }
                                    } else {
                                      const newFilter = createFilter<T>(
                                        fieldKey,
                                        field.defaultOperator || "is",
                                        [value]
                                      )
                                      setLastAddedFilterId(newFilter.id)
                                      onChange([...filters, newFilter])
                                      setAddFilterOpen(false)
                                    }
                                  }}
                                />
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          )
                        }

                        return (
                          <DropdownMenuItem
                            key={field.key}
                            id={itemId}
                            role="option"
                            aria-selected={isHighlighted}
                            data-highlighted={isHighlighted || undefined}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            onClick={() => field.key && addFilter(field.key)}
                            className="data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                          >
                            {field.icon}
                            <span>{field.label}</span>
                            {activeDot}
                          </DropdownMenuItem>
                        )
                      })
                    })()}
                  </ScrollArea>
                </div>
              </div>
              {display === "compact" && filters.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                      onChange([])
                      setAddFilterOpen(false)
                    }}
                  >
                    <XIcon />
                    {mergedI18n.clearFilters ?? DEFAULT_I18N.clearFilters}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {display === "inline" &&
          filters.map((filter) => {
            const field = fieldsMap[filter.field]
            if (!field) return null
            return (
              <ButtonGroup key={filter.id} className={filterChipGroupClassName}>
                <FilterFieldLabel icon={field.icon} label={field.label} />
                <FilterOperatorDropdown<T>
                  field={field}
                  operator={filter.operator}
                  values={filter.values}
                  onChange={(operator) => updateFilter(filter.id, { operator })}
                />
                <FilterValueSelector<T>
                  field={field}
                  values={filter.values}
                  operator={filter.operator}
                  onChange={(values) => updateFilter(filter.id, { values })}
                  autoFocus={filter.id === lastAddedFilterId}
                />
                <FilterRemoveButton onClick={() => removeFilter(filter.id)} />
              </ButtonGroup>
            )
          })}
      </div>
    </FilterContext.Provider>
  )
}

export const createFilter = <T = unknown,>(
  field: string,
  operator?: string,
  values: T[] = []
): Filter<T> => ({
  id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  field,
  operator: operator || "is",
  values,
})