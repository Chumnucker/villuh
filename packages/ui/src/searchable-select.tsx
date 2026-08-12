"use client"

import type { VariantProps } from "class-variance-authority"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "./combobox"
import { inputVariants } from "./input"

export type SearchableSelectProps = {
  id?: string
  value: string
  onValueChange: (next: string) => void
  onBlur?: () => void
  items: string[]
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  /** When set, replaces `placeholder` and marks the control invalid (red placeholder). */
  error?: string | null
  variant?: VariantProps<typeof inputVariants>["variant"]
  size?: VariantProps<typeof inputVariants>["size"]
}

/**
 * Filterable single-select built on Combobox primitives.
 * Value is restricted to `items` (plus any orphan `value` the caller merged in).
 * Trigger chrome matches `Input` via shared `inputVariants`.
 */
export function SearchableSelect({
  id,
  value,
  onValueChange,
  onBlur,
  items,
  placeholder,
  emptyText = "No matches",
  disabled,
  className,
  error,
  variant = "default",
  size = "default",
}: SearchableSelectProps) {
  return (
    <Combobox
      items={items}
      value={value || null}
      onValueChange={(next) => onValueChange(typeof next === "string" ? next : "")}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder}
        error={error}
        disabled={disabled}
        showClear={Boolean(value)}
        variant={variant}
        size={size}
        className={className}
        onBlur={onBlur}
      />
      <ComboboxContent>
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
