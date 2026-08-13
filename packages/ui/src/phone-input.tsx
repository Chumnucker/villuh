"use client"

import * as React from "react"
import * as RPNInput from "react-phone-number-input"
import flags from "react-phone-number-input/flags"
import {
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/min"
import { type InputVariantProps, inputVariants } from "./input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select"
import { PlatformIcon } from "./icon"
import { ScrollArea } from "./scroll-area"
import { cn } from "../utils"

type PhoneInputProps = Omit<
  React.ComponentProps<"input">,
  "onChange" | "value" | "ref" | "size"
> &
  InputVariantProps &
  Omit<RPNInput.Props<typeof RPNInput.default>, "onChange"> & {
    onChange?: (value: RPNInput.Value) => void
    countrySelectClassName?: string
    suffix?: React.ReactNode
    "data-testid"?: string
  }

const PhoneInput: React.ForwardRefExoticComponent<PhoneInputProps> =
  React.forwardRef<React.ElementRef<typeof RPNInput.default>, PhoneInputProps>(
    (
      {
        className,
        onChange,
        size,
        variant,
        value,
        countrySelectClassName,
        suffix,
        defaultCountry = "US",
        "data-testid": dataTestId,
        numberInputProps: numberInputPropsProp,
        ...restProps
      },
      ref
    ) => {
      // react-phone-number-input only displays E.164 reliably. National digits
      // (e.g. "8643814654") need a default-country parse before they show.
      const normalizedValue = React.useMemo(() => {
        if (!value) return undefined
        const raw = String(value)
        const international = parsePhoneNumberFromString(raw)
        if (international?.number) return international.number as RPNInput.Value
        const withDefault = parsePhoneNumberFromString(
          raw,
          defaultCountry as CountryCode
        )
        return (withDefault?.number ?? raw) as RPNInput.Value
      }, [value, defaultCountry])

      const parsed = React.useMemo(() => {
        if (!normalizedValue) return null
        return parsePhoneNumberFromString(String(normalizedValue))
      }, [normalizedValue])

      const showValidationState =
        !suffix && !!normalizedValue && String(normalizedValue).length > 3
      const displayIsValid = normalizedValue
        ? (parsed?.isValid() ?? false)
        : null
      const mergedNumberInputProps =
        numberInputPropsProp as React.ComponentPropsWithoutRef<"input"> | undefined

      return (
        <div
          className={cn(
            inputVariants({ size, variant }),
            "group/phone relative flex w-full items-stretch overflow-hidden p-0"
          )}
        >
          <RPNInput.default
            ref={ref}
            className="flex w-full min-w-0 flex-1"
            flagComponent={FlagComponent}
            countrySelectComponent={CountrySelect}
            smartCaret={false}
            defaultCountry={defaultCountry}
            value={normalizedValue}
            countrySelectProps={{
              size,
              className: countrySelectClassName,
            }}
            numberInputProps={{
              ...mergedNumberInputProps,
              className: cn(
                "h-full min-w-0 w-full flex-1 border-0 bg-transparent pl-2.5 shadow-none",
                "outline-none focus:outline-none focus:ring-0",
                "focus-visible:outline-none focus-visible:ring-0",
                suffix ? "pr-16" : "pr-9",
                className,
                mergedNumberInputProps?.className
              ),
              ...(dataTestId ? { "data-testid": dataTestId } : {}),
            }}
            onChange={(nextValue) =>
              onChange?.(nextValue || ("" as RPNInput.Value))
            }
            {...restProps}
          />

          {suffix && (
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
              {suffix}
            </div>
          )}

          {showValidationState && displayIsValid !== null && (
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              {displayIsValid ? (
                <div className="flex size-4.5 items-center justify-center rounded-full bg-emerald-500/20">
                  <PlatformIcon
                    icon="IconCheckmark1"
                    className="text-emerald-400 size-3"
                    strokeWidth={2.5}
                  />
                </div>
              ) : (
                <div className="flex size-4.5 items-center justify-center rounded-full bg-destructive/20">
                  <PlatformIcon
                    icon="IconCrossLarge"
                    className="text-destructive size-3"
                    strokeWidth={2.5}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )
    }
  )
PhoneInput.displayName = "PhoneInput"
export { PhoneInput }
export { formatPhoneNumber } from "../utils"

type CountryEntry = { label: string; value: RPNInput.Country | undefined }

type CountrySelectProps = {
  disabled?: boolean
  value: RPNInput.Country
  options: CountryEntry[]
  onChange: (country: RPNInput.Country) => void
  className?: string
}

const CountrySelect = ({
  disabled,
  value: selectedCountry,
  options: countryList,
  onChange,
  className,
}: CountrySelectProps & InputVariantProps) => {
  const [searchValue, setSearchValue] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const searchRef = React.useRef<HTMLInputElement>(null)

  const filteredCountries = React.useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) return countryList

    return countryList.filter(({ label, value: country }) => {
      if (!country) return false
      const dialCode = getCountryCallingCode(country as CountryCode)
      return (
        label.toLowerCase().includes(query) ||
        country.toLowerCase().includes(query) ||
        dialCode.includes(query.replace(/^\+/, ""))
      )
    })
  }, [countryList, searchValue])

  const selectedLabel =
    countryList.find(({ value }) => value === selectedCountry)?.label ??
    selectedCountry

  return (
    <Select
      open={open}
      value={selectedCountry}
      disabled={disabled}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          setSearchValue("")
          requestAnimationFrame(() => searchRef.current?.focus())
        }
      }}
      onValueChange={(country) => {
        onChange(country as RPNInput.Country)
        setOpen(false)
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={selectedLabel}
        className={cn(
          "h-full w-fit shrink-0 gap-1 rounded-none border-0 border-r border-border bg-transparent px-2 shadow-none",
          "hover:bg-muted/50 data-[state=open]:bg-muted/50",
          // The wrapper owns the focus ring — the nested trigger must not add its own.
          "focus-within:border-transparent focus-within:ring-0 focus-within:ring-offset-0",
          "[&_[data-slot=select-value]]:sr-only [&_svg:last-child]:opacity-50",
          className
        )}
      >
        <FlagComponent country={selectedCountry} countryName="" />
        <SelectValue />
      </SelectTrigger>

      <SelectContent position="popper" align="start" className="w-[300px] rounded-2xl" sideOffset={7}>
        <div
          className="border-b border-border p-1.5"
          onPointerDown={(event) => event.preventDefault()}
        >
          <input
            ref={searchRef}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search country..."
            className={cn(inputVariants({ size: "sm" }), "h-8")}
          />
        </div>

        <ScrollArea className="max-h-72" constrainContentWidth>
          <SelectGroup>
            {filteredCountries.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No country found.
              </div>
            ) : (
              filteredCountries.map(({ value: country, label: countryName }) =>
                country ? (
                  <SelectItem key={country} value={country} textValue={countryName}>
                    <span className="flex w-full items-center gap-2">
                      <FlagComponent country={country} countryName={countryName} />
                      <span className="flex-1 text-left">{countryName}</span>
                      <span className="text-muted-foreground">{`+${getCountryCallingCode(country as CountryCode)}`}</span>
                    </span>
                  </SelectItem>
                ) : null
              )
            )}
          </SelectGroup>
        </ScrollArea>
      </SelectContent>
    </Select>
  )
}

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = country ? flags[country] : undefined

  if (!country || !Flag) {
    return (
      <span className="h-3.5 w-5 shrink-0 rounded-[3px] bg-muted ring-1 ring-inset ring-border" />
    )
  }

  return (
    <span className="relative flex h-3.5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-[3px] ring-1 ring-inset ring-border [&_svg:not([class*='size-'])]:absolute [&_svg:not([class*='size-'])]:inset-0 [&_svg:not([class*='size-'])]:size-full">
      <Flag title={countryName || ""} />
    </span>
  )
}

export function getFullPhoneNumber(
  countryCode: CountryCode,
  phoneNumber: string
): string {
  if (!phoneNumber) return ""
  if (phoneNumber.startsWith("+")) return phoneNumber
  const parsed = parsePhoneNumberFromString(phoneNumber, countryCode)
  if (parsed) return parsed.format("E.164")
  const digits = phoneNumber.replace(/\D/g, "")
  const dialCode = `+${getCountryCallingCode(countryCode)}`
  return `${dialCode}${digits}`
}
