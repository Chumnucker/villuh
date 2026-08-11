"use client"

import { ViewTransition } from "react"
import { usePathname } from "next/navigation"

export default function ResidentTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <ViewTransition
      key={pathname}
      enter="page-fade"
      exit="page-fade"
      default="none"
    >
      {children}
    </ViewTransition>
  )
}
