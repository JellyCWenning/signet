"use client";

import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useJson } from "@/hooks/use-json";
import { formatUsd } from "@/lib/format";
import type { PolicyRule } from "@/lib/types";

export default function PolicyPage() {
  const { data, error, loading, reload } = useJson<PolicyRule[]>("/api/policy");

  async function toggle(rule: PolicyRule, enabled: boolean) {
    const response = await fetch("/api/policy", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: rule.id, enabled }),
    });
    const body = await response.json();
    if (!response.ok) {
      toast.error(body.error ?? "Unable to update rule");
      return;
    }
    toast.success(`${rule.name} ${enabled ? "enabled" : "disabled"}`);
    await reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transaction Authorization Policy"
        title="Callback policy"
        description="Rules run in priority order against each Co-Signer callback. The first match decides APPROVE, REJECT, or REVIEW. Disable a rule to watch the queue behavior change on the next simulated request."
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading policy…</p>
      ) : (
        <div className="grid gap-3">
          {(data ?? []).map((rule) => (
            <Card key={rule.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{rule.name}</CardTitle>
                    <Badge variant="outline">P{rule.priority}</Badge>
                    <Badge
                      variant="outline"
                      className={
                        rule.decision === "APPROVE"
                          ? "border-teal-400/30 text-teal-200"
                          : rule.decision === "REJECT"
                            ? "border-red-400/30 text-red-200"
                            : "border-amber-400/30 text-amber-200"
                      }
                    >
                      {rule.decision}
                    </Badge>
                  </div>
                  <CardDescription>{rule.description}</CardDescription>
                </div>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(checked) => void toggle(rule, checked)}
                  aria-label={`Toggle ${rule.name}`}
                />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Signer {rule.designatedSigner}
                  {matchSummary(rule)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function matchSummary(rule: PolicyRule): string {
  const parts: string[] = [];
  const { match } = rule;
  if (match.kinds?.length) parts.push(match.kinds.join(", "));
  if (match.operations?.length) parts.push(match.operations.join(", "));
  if (match.dstTypes?.length) parts.push(match.dstTypes.join(", "));
  if (match.configTypes?.length) parts.push(match.configTypes.join(", "));
  if (match.maxUsd != null) parts.push(`≤ ${formatUsd(match.maxUsd)}`);
  if (match.minUsd != null) parts.push(`≥ ${formatUsd(match.minUsd)}`);
  return parts.length ? ` · ${parts.join(" · ")}` : "";
}
