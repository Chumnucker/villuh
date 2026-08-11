import { cn } from "./utils"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"
import { Button } from "./button"
import { PlatformIcon } from "./icon"

const inputVariants = cva(
  cn(
    "&::-webkit-outer-spin-button]:appearance-none flex w-full min-w-0 text-base transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none [&_input::-webkit-inner-spin-button]:m-0 [&_input::-webkit-inner-spin-button]:appearance-none [&_input::-webkit-outer-spin-button]:m-0 [&_input::-webkit-outer-spin-button]:appearance-none [&_input[type=number]]:[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&[type=number]]:[-moz-appearance:textfield]",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 data-[disabled=true]:pointer-events-none data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50",
    "focus-within:ring-1 focus-within:ring-offset-1 focus-within:ring-offset-background focus-within:ring-ring/35 aria-invalid:ring-1 aria-invalid:ring-offset-1 aria-invalid:ring-offset-background aria-invalid:ring-destructive/45"
  ),
  {
    variants: {
      variant: {
        none: "",
        default:
          "bg-input file:text-foreground placeholder:text-muted-foreground",
        light:
          "light border bg-white text-black ile:text-black placeholder:text-muted-foreground",
        muted:
          "border border-transparent bg-muted file:text-foreground placeholder:text-muted-foreground",
        card: "border border-input bg-muted file:text-foreground placeholder:text-muted-foreground",
        ghost:
          "border border-transparent file:text-foreground placeholder:text-muted-foreground",
        secondary:
          "border border-transparent bg-secondary file:text-foreground placeholder:text-muted-foreground",
        popover:
          "border bg-muted file:text-foreground placeholder:text-muted-foreground",
        
        outline:
          "border border-border bg-background",
        "outline-muted":
          "border border-border bg-muted",
        "outline-secondary":
          "border border-border bg-secondary",
      },
      size: {
        none: "",
        default:
          "h-9 rounded-xl px-3 py-2 text-sm md:text-sm [&_svg:not([class*='size-'])]:size-4",
        xs: "h-7 gap-1.5 rounded-xl px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 rounded-xl px-3 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-10 rounded-md px-4 text-sm [&_svg:not([class*='size-'])]:size-4.5",
        text: "rounded-xl px-1 text-sm",
        icon: "size-9 rounded-xl text-sm [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type InputVariantProps = VariantProps<typeof inputVariants>
export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

function Input({
  className,
  variant,
  size,
  type,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ className, variant, size }))}
      {...props}
    />
  )
}

function PasswordInput({
  className,
  variant,
  onChange,
  value,
  size,
  tabIndex,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> &
  VariantProps<typeof inputVariants>) {
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <div
      className={cn(
        inputVariants({
          variant,
          size,
          className: "flex items-center justify-between gap-1 pr-2",
        }),
        className
      )}
      data-disabled={props.disabled}
      {...props}
    >
      <input
        type={showPassword ? "text" : "password"}
        data-slot="input"
        className="min-w-0 flex-1 border-0 outline-0 placeholder:font-normal placeholder:text-muted-foreground"
        onChange={onChange}
        value={value}
        autoComplete="current-password"
        tabIndex={tabIndex}
        {...props}
      />
      <Button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? "Hide password" : "Show password"}
        variant="text-muted"
        className="h-max p-0 hover:text-muted-foreground focus-visible:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none!"
      >
        {showPassword ? (
          <PlatformIcon icon={"IconEyeOpen"} />
        ) : (
          <PlatformIcon icon={"IconEyeClosed"} />
        )}
      </Button>
    </div>
  )
}

function SearchInput({
  className,
  variant = "muted",
  onChange,
  value,
  size,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "size"> &
  VariantProps<typeof inputVariants>) {
  return (
    <div
      className={cn(
        inputVariants({
          variant,
          size,
          className: "flex shrink-0 items-center gap-2 font-normal",
        }),
        className
      )}
      {...props}
    >
      <PlatformIcon
        className="min-w-4 text-muted-foreground"
        icon="IconMagnifyingGlass"
        size={18}
        stroke="2"
      />

      <input
        type="text"
        data-slot="input"
        className="flex-1 border-0 outline-0"
        onChange={onChange}
        value={value}
        {...props}
      />
    </div>
  )
}

function ContainerInput({
  className,
  inputClassName,
  variant = "ghost",
  onChange,
  value,
  size,
  children,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "size"> &
  VariantProps<typeof inputVariants> & {
    inputClassName?: string
  }) {
  return (
    <div
      className={cn(
        inputVariants({
          variant,
          size,
          className: "flex items-center gap-2 font-normal",
        }),
        className
      )}
      {...props}
    >
      <input
        type="text"
        data-slot="input"
        className={cn(
          "flex-1 border-0 outline-0 placeholder:text-muted-foreground",
          inputClassName
        )}
        onChange={onChange}
        value={value}
        {...props}
      />

      {children}
    </div>
  )
}

export { ContainerInput, Input, inputVariants, PasswordInput, SearchInput }
