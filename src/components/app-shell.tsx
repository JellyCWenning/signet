"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ClipboardList,
  Gavel,
  LayoutDashboard,
  Menu,
  ScrollText,
  Settings,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useJson } from "@/hooks/use-json";
import type { DashboardStats } from "@/lib/types";
import { SimulateDialog } from "@/components/simulate-dialog";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/queue", label: "Queue", icon: ClipboardList },
  { href: "/policy", label: "Policy", icon: Gavel },
  { href: "/bot", label: "Ops bot", icon: Bot },
  { href: "/audit", label: "Audit", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useJson<{ stats: DashboardStats }>("/api/workspace", 4000);

  return (
    <div className="flex min-h-full flex-1 bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Brand />
        <Nav pathname={pathname} pending={data?.stats.pending ?? 0} />
        <WorkspaceFoot pending={data?.stats.pending ?? 0} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border/80 px-4 py-3 lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <Sheet>
              <SheetTrigger render={<Button variant="ghost" size="icon" />}>
                <Menu />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <Brand />
                <Nav pathname={pathname} pending={data?.stats.pending ?? 0} />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-medium">Fireblocks Co-Sign</span>
          </div>
          <p className="hidden text-sm text-muted-foreground lg:block">
            Callback handler for API Co-Signers · JSON demo mode
          </p>
          <SimulateDialog />
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
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
        <p className="text-sm font-medium tracking-tight">Fireblocks Co-Sign</p>
        <p className="text-[11px] text-muted-foreground">Northstar Production</p>
      </div>
    </div>
  );
}

function Nav({ pathname, pending }: { pathname: string; pending: number }) {
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
            {item.href === "/queue" && pending > 0 ? (
              <span className="rounded-full bg-amber-400/20 px-1.5 text-[11px] text-amber-200">
                {pending}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function WorkspaceFoot({ pending }: { pending: number }) {
  return (
    <div className="border-t border-sidebar-border px-4 py-4 text-xs text-muted-foreground">
      <p className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-teal-400" />
        nitro-prod-1 online
      </p>
      <p className="mt-1">{pending} held for review</p>
    </div>
  );
}
