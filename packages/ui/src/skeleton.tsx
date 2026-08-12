"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

/**
 * Shared shimmer backgrounds for loading placeholders (tw-shimmer).
 * Use `SkeletonContainer` as the outer wrapper — it applies
 * `shimmer-container`, which sizes timing from the container width.
 *
 * Table-style rows (e.g. settings users) compose `SkeletonContainer` with
 * `SkeletonBox` / `SkeletonLabel` / `SkeletonInput`. For form-like stacks,
 * use `SkeletonField` (label + input placeholders).
 *
 * Every bar pins `text-foreground` so the highlight derives from the
 * theme ink color. Default tw-shimmer bg highlight is ~6% (too faint on
 * our surfaces) — pin `shimmer-color-foreground/20` for a visible sweep.
 *
 * For a single diagonal wave across clipped overlays / spaced cards, pass
 * `syncOffsets` — tw-shimmer needs `--shimmer-x` / `--shimmer-y` per
 * `.shimmer` node and does not measure the DOM itself.
 */
const SHIMMER_CLS =
  "shimmer shimmer-bg shimmer-color-foreground/20 text-foreground";

const skeletonToneVariants = cva(SHIMMER_CLS, {
  variants: {
    tone: {
      default: "bg-muted",
      muted: "bg-muted/80",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export type SkeletonToneProps = VariantProps<typeof skeletonToneVariants>;

type SkeletonContainerProps = React.ComponentPropsWithoutRef<"div"> & {
  /**
   * Measure each `.shimmer` descendant and set `--shimmer-x` / `--shimmer-y`
   * relative to this container so angled sweeps stay aligned across gaps
   * and `overflow:hidden` clip regions. Off by default — most skeletons
   * look fine without it.
   */
  syncOffsets?: boolean;
};

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

const SkeletonContainer = React.forwardRef<
  HTMLDivElement,
  SkeletonContainerProps
>(function SkeletonContainer(
  { className, syncOffsets = false, ...props },
  ref,
) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  const setRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  React.useLayoutEffect(() => {
    if (!syncOffsets) return;
    const root = rootRef.current;
    if (!root) return;

    const sync = () => {
      const origin = root.getBoundingClientRect();
      for (const el of root.querySelectorAll<HTMLElement>(".shimmer")) {
        const rect = el.getBoundingClientRect();
        el.style.setProperty(
          "--shimmer-x",
          String(Math.round(rect.left - origin.left)),
        );
        el.style.setProperty(
          "--shimmer-y",
          String(Math.round(rect.top - origin.top)),
        );
      }
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(root);
    return () => observer.disconnect();
  }, [syncOffsets]);

  return (
    <div
      ref={setRef}
      data-slot="skeleton-container"
      className={cn("flex shimmer-container", className)}
      {...props}
    />
  );
});

type SkeletonBoxProps = React.ComponentPropsWithoutRef<"div"> &
  SkeletonToneProps;

const SkeletonBox = React.forwardRef<HTMLDivElement, SkeletonBoxProps>(
  function SkeletonBox({ className, tone, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="skeleton-box"
        className={cn(skeletonToneVariants({ tone }), "rounded", className)}
        {...props}
      />
    );
  },
);

type SkeletonLabelProps = React.ComponentPropsWithoutRef<"div"> &
  SkeletonToneProps;

const SkeletonLabel = React.forwardRef<HTMLDivElement, SkeletonLabelProps>(
  function SkeletonLabel({ className, tone, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="skeleton-label"
        className={cn(
          skeletonToneVariants({ tone }),
          "h-3.5 rounded",
          className,
        )}
        {...props}
      />
    );
  },
);

type SkeletonInputProps = React.ComponentPropsWithoutRef<"div"> &
  SkeletonToneProps;

const SkeletonInput = React.forwardRef<HTMLDivElement, SkeletonInputProps>(
  function SkeletonInput({ className, tone, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="skeleton-input"
        className={cn(
          skeletonToneVariants({ tone }),
          "h-5 w-14 rounded-md",
          className,
        )}
        {...props}
      />
    );
  },
);

type SkeletonFieldProps = React.ComponentPropsWithoutRef<"div"> &
  SkeletonToneProps & {
    /** When false, only the input placeholder is shown. Ignored if `children` is set. */
    showLabel?: boolean;
    labelClassName?: string;
    inputClassName?: string;
  };

const SkeletonField = React.forwardRef<HTMLDivElement, SkeletonFieldProps>(
  function SkeletonField(
    {
      className,
      tone,
      showLabel = true,
      labelClassName,
      inputClassName,
      children,
      ...props
    },
    ref,
  ) {
    if (children != null) {
      return (
        <div
          ref={ref}
          data-slot="skeleton-field"
          className={cn("flex flex-col gap-1.5", className)}
          {...props}
        >
          {children}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        data-slot="skeleton-field"
        className={cn("flex flex-col gap-1.5", className)}
        {...props}
      >
        {showLabel ? (
          <SkeletonLabel tone={tone} className={cn("w-24", labelClassName)} />
        ) : null}
        <SkeletonInput
          tone={tone}
          className={cn("h-9 w-full rounded-md", inputClassName)}
        />
      </div>
    );
  },
);

export {
  SkeletonContainer,
  SkeletonBox,
  SkeletonLabel,
  SkeletonInput,
  SkeletonField,
  skeletonToneVariants,
};
