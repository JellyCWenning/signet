"use client";

import { Shield } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border/80 px-4 py-3 lg:px-8">
        <div className="flex size-9 items-center justify-center rounded-lg bg-teal-400/15 ring-1 ring-teal-400/30">
          <Shield className="size-4 text-teal-300" />
        </div>
        <div>
          <p className="text-sm font-medium tracking-tight">TAP Console</p>
          <p className="text-[11px] text-muted-foreground">Venue TAP · Albert</p>
        </div>
      </header>
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
