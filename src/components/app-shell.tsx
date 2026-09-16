"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gavel,
  GitBranch,
  LayoutDashboard,
  Menu,
  Settings,
  Shield,
  SlidersHorizontal,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/console", label: "Console", icon: SlidersHorizontal },
  { href: "/policy", label: "Fireblocks TAP", icon: Gavel },
  { href: "/flow", label: "With Fireblocks", icon: GitBranch },
  { href: "/direct", label: "No Fireblocks", icon: Unplug },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-1 bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Brand />
        <Nav pathname={pathname} />
        <WorkspaceFoot />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border/80 px-4 py-3 lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <Sheet>
              <SheetTrigger render={<Button type="button" variant="ghost" size="icon" />}>
                <Menu />
                <span className="sr-only">Open navigation</span>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <Brand />
                <Nav pathname={pathname} />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-medium">TAP Console</span>
          </div>
          <p className="hidden text-sm text-muted-foreground lg:block">
            Venue TAP · Fireblocks API · no callback
          </p>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-4 py-5">
      <div className="flex size-9 items-center justify-center rounded-lg bg-teal-400/15 ring-1 ring-teal-400/30">
        <Shield className="size-4 text-teal-300" />
      </div>
      <div>
        <p className="text-sm font-medium tracking-tight">TAP Console</p>
        <p className="text-[11px] text-muted-foreground">Albert accounts</p>
      </div>
    </div>
  );
}

function Nav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="flex-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function WorkspaceFoot() {
  return (
    <div className="border-t border-sidebar-border px-4 py-4 text-xs text-muted-foreground">
      <p className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-teal-400" />
        live Hyperliquid + Lighter
      </p>
      <p className="mt-1">Co-Signer lives in Fireblocks, not here</p>
    </div>
  );
}
