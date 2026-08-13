import localFont from "next/font/local"
import { Inter } from "next/font/google"
import { NuqsAdapter } from "nuqs/adapters/next/app"

import "./globals.css"
import { cn, ThemeProvider, LayoutProvider, Toaster } from "@villuh/ui"
import { TRPCProvider } from "@villuh/api"

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
        <NuqsAdapter>
          <ThemeProvider>
            <TRPCProvider>
              <LayoutProvider>{children}</LayoutProvider>
              <Toaster />
            </TRPCProvider>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  )
}
