"use client"

import * as React from "react"
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
  name?: string
  value: string
  onValueChange: (next: string) => void
  onBlur?: () => void
  items: string[]
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  /**
   * Browser autofill token. Defaults to a non-address token — Chrome often
   * ignores bare `"off"` when the control sits near street/city fields.
   */
  autoComplete?: string
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
  name,
  value,
  onValueChange,
  onBlur,
  items,
  placeholder,
  emptyText = "No matches",
  disabled,
  className,
  // Chrome treats many tokens as address autofill near street fields; OTP-style
  // tokens are one of the few that reliably suppress the address dropdown.
  autoComplete = "one-time-code",
  error,
  variant = "default",
  size = "default",
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  // Keep the visible input text in sync with the selected value when closed.
  // Base UI's filter input can otherwise stay blank after controlled prefills.
  const [inputValue, setInputValue] = React.useState(value)
  // Chrome still autofills read/write address fields on paint; lock until focus.
  const [readOnly, setReadOnly] = React.useState(true)

  React.useEffect(() => {
    if (!open) setInputValue(value)
  }, [value, open])

  return (
    <Combobox
      items={items}
      value={value || null}
      inputValue={inputValue}
      open={open}
      onOpenChange={setOpen}
      onValueChange={(next) => {
        const selected = typeof next === "string" ? next : ""
        onValueChange(selected)
        setInputValue(selected)
      }}
      onInputValueChange={(next) => setInputValue(next)}
    >
      <ComboboxInput
        id={id}
        name={name}
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        readOnly={readOnly}
        data-1p-ignore=""
        data-lpignore="true"
        data-form-type="other"
        placeholder={placeholder}
        error={error}
        disabled={disabled}
        showClear={Boolean(value)}
        variant={variant}
        size={size}
        className={className}
        onFocus={() => setReadOnly(false)}
        onBlur={() => {
          setReadOnly(true)
          onBlur?.()
        }}
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
