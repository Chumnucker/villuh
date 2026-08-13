"use client"

import * as React from "react"
import { toast } from "sonner"

import { cn } from "../utils"
import { Button, type ButtonProps } from "./button"
import { PlatformIcon } from "./icon"

const RESET_DELAY_MS = 2000

export interface CopyButtonProps extends Omit<ButtonProps, "children" | "onCopy"> {
  /** The text written to the clipboard when clicked. */
  value: string
  /** What's being copied, e.g. "Address" — used for the default toast message and aria-label. */
  label?: string
  /** Overrides the default `"{label} copied"` / "Copied to clipboard" toast message. */
  toastMessage?: string
  /** Set to false to skip the success toast. Defaults to true. */
  showToast?: boolean
  /** Icon pixel size, passed through to both the copy and checkmark icons. */
  iconSize?: number
  onCopy?: (value: string) => void
}

/** Icon-first copy-to-clipboard button — morphs into a checkmark on click, resets
 * after a short delay, and toasts a confirmation. Accepts all `Button` variant/size
 * props so it can be dropped in anywhere a regular `Button` would go. */
function CopyButton({
  value,
  label,
  toastMessage,
  showToast = true,
  iconSize = 14,
  onCopy,
  variant = "ghost",
  size = "icon-xs",
  className,
  disabled,
  "aria-label": ariaLabel,
  ...props
}: CopyButtonProps) {
  const [isCopied, setIsCopied] = React.useState(false)
  const resetTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  React.useEffect(() => {
    return () => clearTimeout(resetTimeoutRef.current)
  }, [])

  const handleClick = React.useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      if (!value) return

      try {
        await navigator.clipboard.writeText(value)
      } catch {
        toast.error("Couldn't copy to clipboard")
        return
      }

      setIsCopied(true)
      clearTimeout(resetTimeoutRef.current)
      resetTimeoutRef.current = setTimeout(
        () => setIsCopied(false),
        RESET_DELAY_MS
      )

      if (showToast) {
        toast.success(
          toastMessage ?? (label ? `${label} copied to clipboard` : "Copied to clipboard")
        )
      }
      onCopy?.(value)
    },
    [value, showToast, toastMessage, label, onCopy]
  )

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={disabled || !value}
      onClick={handleClick}
      aria-label={ariaLabel ?? (label ? `Copy ${label}` : "Copy to clipboard")}
      className={className}
      {...props}
    >
      <span className="relative inline-grid place-items-center [&_svg]:col-start-1 [&_svg]:row-start-1">
        <PlatformIcon
          icon="IconCopy"
          size={iconSize}
          className={cn(
            "transition-all duration-200 ease-out",
            isCopied ? "scale-50 opacity-0" : "scale-100 opacity-100"
          )}
        />
        <PlatformIcon
          icon="IconCheckmark1"
          size={iconSize}
          className={cn(
            "transition-all duration-200 ease-out",
            isCopied ? "scale-100 opacity-100" : "scale-50 opacity-0"
          )}
        />
      </span>
    </Button>
  )
}

export { CopyButton }
