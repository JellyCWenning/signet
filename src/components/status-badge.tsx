import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/format";

const STATUS_CLASS: Record<string, string> = {
  pending:
    "border-amber-400/30 bg-amber-400/12 text-amber-200",
  approved: "border-teal-400/30 bg-teal-400/12 text-teal-200",
  auto_approved: "border-teal-400/30 bg-teal-400/12 text-teal-200",
  rejected: "border-red-400/30 bg-red-400/12 text-red-200",
  auto_rejected: "border-red-400/30 bg-red-400/12 text-red-200",
  ignored: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", STATUS_CLASS[status] ?? STATUS_CLASS.ignored)}
    >
      {statusLabel(status)}
    </Badge>
  );
}

export function HealthDot({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "online" && "bg-teal-400 shadow-[0_0_8px_var(--color-teal-400)]",
          status === "degraded" && "bg-amber-400",
          status === "offline" && "bg-red-400",
        )}
      />
      {status}
    </span>
  );
}
