"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/app-shell";

export function Providers({
  children,
  pending,
}: {
  children: React.ReactNode;
  pending: number;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <TooltipProvider>
        <AppShell initialPending={pending}>{children}</AppShell>
        <Toaster position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
