"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { PlatformIcon } from "./icon"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <PlatformIcon icon="IconCircleCheck" size={16} />,
        info: <PlatformIcon icon="IconCircleInfo" size={16} />,
        warning: <PlatformIcon icon="IconWarningSign" size={16} />,
        error: <PlatformIcon icon="IconCrossLarge" size={16} />,
        loading: <PlatformIcon icon="IconLoader" className="animate-spin" size={16} />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
