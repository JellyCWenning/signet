"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useJson } from "@/hooks/use-json";
import { formatUsd } from "@/lib/format";
import type { PolicyRule, SignRequest } from "@/lib/types";

export default function PolicyPage() {
  const router = useRouter();
  const { data, error, loading, reload } = useJson<PolicyRule[]>("/api/policy");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function propose(
    rule: PolicyRule,
    patch: { enabled?: boolean; maxUsd?: number | null },
  ) {
    setBusy(rule.id);
    try {
      const response = await fetch("/api/policy", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: rule.id, ...patch }),
      });
      const body = (await response.json()) as SignRequest & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to submit policy change");
      toast.success("Submitted for human approval", { description: body.id });
      await reload();
      router.push(`/queue/${body.id}`);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to submit");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transaction Authorization Policy"
        title="Callback policy"
        description="Live TAP decides whether the Co-Signer auto-approves a Fireblocks transfer. Editing a threshold or toggling a rule does not take effect until an operator approves the POLICY_APPROVAL request."
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading policy…</p>
      ) : (
        <div className="grid gap-3">
          {(data ?? []).map((rule) => {
            const draft = drafts[rule.id] ?? String(rule.match.maxUsd ?? "");
            return (
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
                      {!rule.enabled ? (
                        <Badge variant="outline">Disabled</Badge>
                      ) : null}
                    </div>
                    <CardDescription>{rule.description}</CardDescription>
                  </div>
                  <Switch
                    checked={rule.enabled}
                    disabled={busy === rule.id}
                    onCheckedChange={(checked) => void propose(rule, { enabled: checked })}
                    aria-label={`Propose ${rule.enabled ? "disabling" : "enabling"} ${rule.name}`}
                  />
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Signer {rule.designatedSigner}
                    {matchSummary(rule)}
                  </p>
                  {rule.match.maxUsd != null || rule.decision === "APPROVE" ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label className="text-xs text-muted-foreground whitespace-nowrap">
                        Auto-sign ceiling (USD)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={draft}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [rule.id]: event.target.value,
                          }))
                        }
                        className="sm:max-w-40"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === rule.id}
                        onClick={() => {
                          const value = draft === "" ? null : Number(draft);
                          if (value != null && Number.isNaN(value)) {
                            toast.error("Enter a number");
                            return;
                          }
                          void propose(rule, { maxUsd: value });
                        }}
                      >
                        Submit threshold
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
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
