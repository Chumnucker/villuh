"use client";

import * as React from "react";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { cn } from "./utils";

type ScrollAreaProps = React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  viewportRef?: React.Ref<HTMLDivElement>;
  viewportClassName?: string;
  contentClassName?: string;
  /**
   * Base UI's `ScrollArea.Content` defaults to `min-width: fit-content` so its
   * children can overflow horizontally. Set this to constrain the content to
   * the viewport width (vertical-scroll-only surfaces like sidebars).
   */
  constrainContentWidth?: boolean;
};

/**
 * App-wide ScrollArea wrapper around Base UI's `ScrollArea`. Keeps the same
 * public surface as the previous Radix-based component (`ScrollArea`,
 * `ScrollBar`, plus `viewportRef` / `viewportClassName` escape hatches) so
 * existing call-sites don't need to change.
 *
 * Native OS scrollbars are hidden on the viewport; the custom thumb is the
 * only visible affordance. It fades in while the pointer is over the area,
 * while content is focused, or while the user is scrolling.
 */
function ScrollArea({
  className,
  children,
  viewportRef,
  viewportClassName,
  contentClassName,
  constrainContentWidth,
  ...props
}: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("group/scroll-area relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        className={cn(
          // `max-h-[inherit]` / `max-w-[inherit]` ensures the viewport (which
          // is the actual scrollable element via `overflow: scroll`) is capped
          // when the Root uses only a `max-height` / `max-width` constraint.
          // Without this, `size-full` resolves to `auto` against a parent that
          // has no explicit height, and the viewport grows to fit its content
          // — so nothing ever overflows and scrolling never engages.
          "size-full max-h-[inherit] max-w-[inherit] rounded-[inherit] outline-none focus-visible:ring-0",
          viewportClassName,
        )}
      >
        <ScrollAreaPrimitive.Content
          data-slot="scroll-area-content"
          className={cn(
            constrainContentWidth && "flex min-h-full min-w-0 w-full flex-col",
            contentClassName,
          )}
          style={constrainContentWidth ? { minWidth: 0, width: "100%" } : undefined}
        >
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar orientation="vertical" />
      <ScrollBar orientation="horizontal" />
      <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Scrollbar>) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "z-20 flex touch-none select-none p-px opacity-0 transition-opacity duration-150 ease-out",
        "data-[hovering]:opacity-100 data-[scrolling]:opacity-100",
        "group-focus-within/scroll-area:opacity-100",
        orientation === "vertical" &&
          "h-full w-1.75 border-l border-l-transparent",
        orientation === "horizontal" &&
          "h-1.5 w-full flex-col border-t border-t-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="flex-1 rounded-full bg-foreground/25 hover:bg-foreground/40 transition-colors"
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
