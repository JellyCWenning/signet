"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Console" },
  { href: "/accounts", label: "Accounts" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="flex items-center gap-6 border-b border-border/80 px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-teal-400/15 ring-1 ring-teal-400/30">
            <Shield className="size-4 text-teal-300" />
          </div>
          <div>
            <p className="text-sm font-medium tracking-tight">TAP Console</p>
            <p className="text-[11px] text-muted-foreground">Venue TAP · Albert</p>
          </div>
        </div>
        <nav className="flex items-center gap-1 text-sm">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
