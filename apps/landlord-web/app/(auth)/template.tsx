"use client"

import { ViewTransition } from "react"
import { usePathname } from "next/navigation"

/** Auth pages: same page-fade as the app shell, without chrome. */
export default function AuthTemplate({
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
