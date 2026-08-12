"use client"

import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  PlatformIcon,
  cn,
  type PlatformIconName,
} from "@villuh/ui"
import {
  TAG_ICON_KEYS,
  TAG_COLOR_KEYS,
  TAG_SWATCH_CLASSES,
  type TagIconKey,
  type TagColorKey,
} from "./tag-palette"

/**
 * Fixed-palette picker (D-21, T-03-16): only the 14 `icon_key` / 8 `color_key` enum values from
 * the UI-SPEC are selectable — no free hex input, no arbitrary icon name entry. Shared by
 * `TagPicker` (freeform create), `ManageTagsDialog` (org catalog edit), and `StatusCatalogPanel`.
 */
export function TagIconColorPicker({
  iconKey,
  colorKey,
  onChange,
  disabled,
}: {
  iconKey: TagIconKey
  colorKey: TagColorKey
  onChange: (next: { iconKey: TagIconKey; colorKey: TagColorKey }) => void
  disabled?: boolean
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          className={cn("rounded-full border-transparent text-white", TAG_SWATCH_CLASSES[colorKey])}
        >
          <PlatformIcon icon={iconKey as PlatformIconName} size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">Icon</p>
            <div className="grid grid-cols-7 gap-1">
              {TAG_ICON_KEYS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => onChange({ iconKey: icon, colorKey })}
                  aria-label={icon}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    icon === iconKey && "bg-accent text-accent-foreground ring-1 ring-ring/30"
                  )}
                >
                  {/* IconWrench (a locked D-21 key) is missing from the installed @central-icons-react/all
                      package (pre-existing gap flagged in Plan 06) — cast keeps the fixed icon_key
                      palette intact without weakening the type for the other 13 valid keys. */}
                  <PlatformIcon icon={icon as PlatformIconName} size={16} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">Color</p>
            <div className="grid grid-cols-8 gap-1">
              {TAG_COLOR_KEYS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChange({ iconKey, colorKey: color })}
                  aria-label={color}
                  className={cn(
                    "size-6 rounded-full ring-offset-2 ring-offset-popover",
                    TAG_SWATCH_CLASSES[color],
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
