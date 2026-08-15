"use client"

import { useMemo, useState } from "react"
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  PlatformIcon,
  ScrollArea,
  SearchInput,
  cn,
} from "@villuh/ui"
import {
  AMENITY_ICON_KEYS,
  AMENITY_ICON_COLOR_CLASSES,
  AMENITY_SWATCH_CLASSES,
  TAG_COLOR_KEYS,
  type AmenityIconKey,
  type TagColorKey,
} from "../lib/amenity-icons"

/** Turn an `IconAirConditioning` key into a searchable `air conditioning` label. */
function iconLabel(key: AmenityIconKey): string {
  return key
    .replace(/^Icon/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim()
}

/**
 * Fixed-palette amenity picker (D-42): only the `amenity_icon` keys and the shared
 * `tag_color` values are selectable — no free hex input, no arbitrary icon name entry.
 * The icon grid is searchable and scrolls inside a `ScrollArea`; the 6-column layout is
 * sized to never overflow the popover horizontally. Emits `{ iconKey, colorKey }` on any
 * change. Reused by the catalog dialog, the property amenity sheet, and freeform add flows.
 */
export function AmenityIconColorPicker({
  iconKey,
  colorKey,
  onChange,
  disabled,
  size = "default",
  className,
}: {
  iconKey: AmenityIconKey
  colorKey: TagColorKey
  onChange: (next: { iconKey: AmenityIconKey; colorKey: TagColorKey }) => void
  disabled?: boolean
  /** `sm` fits InputGroup / badge chips; default matches standalone catalog rows. */
  size?: "default" | "sm"
  className?: string
}) {
  const [query, setQuery] = useState("")

  const filteredIcons = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return AMENITY_ICON_KEYS
    return AMENITY_ICON_KEYS.filter((icon) => iconLabel(icon).includes(q))
  }, [query])

  return (
    <Popover
      modal={true}
      onOpenChange={(open) => {
        if (!open) setQuery("")
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={size === "sm" ? "icon-xs" : "icon"}
          disabled={disabled}
          className={cn(
            "shrink-0 transition-colors duration-200 ease-out",
            AMENITY_ICON_COLOR_CLASSES[colorKey],
            className
          )}
        >
          <PlatformIcon icon={iconKey} size={size === "sm" ? 14 : 16} />
          <span className="sr-only">Choose icon and color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72"
        align="start"
        alignOffset={-9}
        sideOffset={12}
      >
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">Icon</p>
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons…"
              size="xs"
              className="mb-2"
              aria-label="Search icons"
            />
            <ScrollArea className="h-48" alwaysShowScrollbar>
              {filteredIcons.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No icons found
                </p>
              ) : (
                <div className="grid grid-cols-6 gap-1 pr-2">
                  {filteredIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => onChange({ iconKey: icon, colorKey })}
                      aria-label={iconLabel(icon)}
                      title={iconLabel(icon)}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-xl transition-colors duration-200 ease-out hover:bg-accent",
                        AMENITY_ICON_COLOR_CLASSES[colorKey],
                        icon === iconKey && "bg-accent ring-1 ring-ring/35"
                      )}
                    >
                      <PlatformIcon icon={icon} size={16} />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">Color</p>
            <div className="grid grid-cols-8 gap-1.5">
              {TAG_COLOR_KEYS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChange({ iconKey, colorKey: color })}
                  aria-label={color}
                  className={cn(
                    "size-6 rounded-full ring-offset-2 ring-offset-popover transition-all duration-200 ease-out",
                    AMENITY_SWATCH_CLASSES[color],
                    color === colorKey && "ring-2 ring-ring"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
