"use client";

import PageTransitionEffect from "@/app/page-transition";
import { ThemeProvider } from "./theme-provider";

const RootProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      disableTransitionOnChange>
      <PageTransitionEffect>{children}</PageTransitionEffect>
    </ThemeProvider>
  );
};

export default RootProvider;
