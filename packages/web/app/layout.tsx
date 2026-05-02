import localFont from "next/font/local"
import { Inter } from "next/font/google"

import "./globals.css"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/modules/app/components/theme-provider"
import { LayoutProvider } from "@/modules/app/providers/layout-provider"
import { QueryProvider } from "@/modules/app/providers/query-provider"
import { Toaster } from "@/modules/common/ui/sonner"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = localFont({
  src: [
    { path: "./fonts/Gambetta-Variable.woff2", style: "normal" },
    { path: "./fonts/Gambetta-VariableItalic.woff2", style: "italic" },
  ],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body>
        <ThemeProvider>
          <QueryProvider>
            <LayoutProvider>{children}</LayoutProvider>
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
