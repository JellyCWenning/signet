"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/app-shell";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <TooltipProvider>
        <AppShell>{children}</AppShell>
        <Toaster position="top-center" richColors closeButton duration={6000} />
      </TooltipProvider>
    </ThemeProvider>
  );
}
