import Link from "next/link";
import { cn } from "@/lib/utils";

export function FlowSwitch({ current }: { current: "fireblocks" | "direct" }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/flow"
        className={cn(
          "rounded-lg border px-3 py-1.5 text-sm",
          current === "fireblocks"
            ? "border-teal-400/40 bg-teal-400/10 text-foreground"
            : "border-border/80 text-muted-foreground hover:bg-muted/40",
        )}
      >
        With Fireblocks
      </Link>
      <Link
        href="/direct"
        className={cn(
          "rounded-lg border px-3 py-1.5 text-sm",
          current === "direct"
            ? "border-teal-400/40 bg-teal-400/10 text-foreground"
            : "border-border/80 text-muted-foreground hover:bg-muted/40",
        )}
      >
        No Fireblocks
      </Link>
    </div>
  );
}
