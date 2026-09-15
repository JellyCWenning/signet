"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useJson } from "@/hooks/use-json";
import { TapCallbackMap } from "@/components/tap-callback-map";
import { amountLabel, assetLabel, destLabel, sourceLabel, tapAction, typeLabel } from "@/lib/tap";
import { cn } from "@/lib/utils";
import type { PolicyDecision, PolicyRule, SignRequest } from "@/lib/types";

export function PolicyView({
  initial,
}: {
  initial: { rules: PolicyRule[]; pending: SignRequest[] };
}) {
  const { data, error, loading, setData } = useJson("/api/policy", 2500, initial);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [newName, setNewName] = useState("Allowlisted CEX under ceiling");
  const [newDest, setNewDest] = useState("EXCHANGE");
  const [newMax, setNewMax] = useState("50000");
  const [newDecision, setNewDecision] = useState<PolicyDecision>("APPROVE");

  const rules = data?.rules ?? [];
  const pending = data?.pending ?? [];

  async function propose(rule: PolicyRule, patch: { enabled?: boolean; maxUsd?: number | null }) {
    setBusy(rule.id);
    try {
      const response = await fetch("/api/policy", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: rule.id, ...patch }),
      });
      const body = (await response.json()) as {
        error?: string;
        rules?: PolicyRule[];
        pending?: SignRequest[];
        change?: SignRequest;
      };
      if (!response.ok || !body.rules || !body.pending) {
        throw new Error(body.error ?? "Unable to submit TAP change");
      }
      setData({ rules: body.rules, pending: body.pending });
      toast.success("Waiting on human approval", { description: body.change?.id });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to submit");
    } finally {
      setBusy(null);
    }
  }

  async function addRule() {
    setBusy("new");
    try {
      const maxUsd = newMax === "" ? null : Number(newMax);
      if (maxUsd != null && Number.isNaN(maxUsd)) throw new Error("Enter a valid USD ceiling");
      const response = await fetch("/api/policy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newName,
          destType: newDest,
          maxUsd,
          decision: newDecision,
          designatedSigner: "api_signer_treasury",
        }),
      });
      const body = (await response.json()) as {
        error?: string;
        rules?: PolicyRule[];
        pending?: SignRequest[];
        change?: SignRequest;
      };
      if (!response.ok || !body.rules || !body.pending) {
        throw new Error(body.error ?? "Unable to add TAP rule");
      }
      setData({ rules: body.rules, pending: body.pending });
      toast.success("New TAP rule submitted for approval", { description: body.change?.id });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to add TAP rule");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transaction Authorization Policy"
        title="TAP"
        description="This is our TAP, served behind the Co-Signer callback. First matching live rule wins: ALLOW returns APPROVE immediately. Changing a threshold or rule creates a POLICY_APPROVAL — live TAP does not change until a human approves it."
      />

      <TapCallbackMap />

      {pending.length > 0 ? (
        <Card className="border-amber-400/30">
          <CardHeader>
            <CardTitle>Pending human approval</CardTitle>
            <CardDescription>
              These TAP edits are drafts. The Co-Signer still evaluates the live rules below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map((request) => (
              <div key={request.id} className="flex items-center justify-between gap-3 text-sm">
                <p>
                  <span className="font-mono text-xs text-muted-foreground">{request.id}</span>
                  <span className="ml-2">{String(request.extraInfo?.summary ?? "TAP change")}</span>
                </p>
                <Button size="sm" nativeButton={false} render={<Link href={`/queue/${request.id}`} />}>
                  Review
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading TAP…</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Live rules</CardTitle>
            <CardDescription>
              Initiator is the API bot paired to the Co-Signer. Amount is USD / single transaction.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Designated signer</TableHead>
                  <TableHead className="text-right">On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => {
                  const action = tapAction(rule.decision);
                  const draft = drafts[rule.id] ?? String(rule.match.maxUsd ?? "");
                  return (
                    <TableRow key={rule.id} className={cn(!rule.enabled && "opacity-50")}>
                      <TableCell className="font-mono text-xs">{rule.priority}</TableCell>
                      <TableCell>{typeLabel(rule)}</TableCell>
                      <TableCell>{sourceLabel(rule)}</TableCell>
                      <TableCell>{destLabel(rule)}</TableCell>
                      <TableCell>{assetLabel(rule)}</TableCell>
                      <TableCell>
                        {rule.decision === "APPROVE" || rule.match.maxUsd != null ? (
                          <div className="flex min-w-40 items-center gap-1.5">
                            <Input
                              type="number"
                              min={0}
                              value={draft}
                              className="h-7 w-24"
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [rule.id]: event.target.value,
                                }))
                              }
                            />
                            <Button
                              type="button"
                              size="xs"
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
                              Save
                            </Button>
                          </div>
                        ) : (
                          amountLabel(rule)
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            action === "ALLOW"
                              ? "border-teal-400/30 text-teal-200"
                              : action === "BLOCK"
                                ? "border-red-400/30 text-red-200"
                                : "border-amber-400/30 text-amber-200"
                          }
                        >
                          {action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{rule.designatedSigner}</TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={rule.enabled}
                          disabled={busy === rule.id}
                          onCheckedChange={(checked) => void propose(rule, { enabled: checked })}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add TAP rule</CardTitle>
          <CardDescription>
            The new rule is a draft until an operator approves the POLICY_APPROVAL request.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input value={newName} onChange={(event) => setNewName(event.target.value)} />
          <Select value={newDest} onValueChange={(value) => setNewDest(String(value))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VAULT">Vault</SelectItem>
              <SelectItem value="EXCHANGE">Exchange</SelectItem>
              <SelectItem value="UNMANAGED">Unmanaged / allowlisted</SelectItem>
              <SelectItem value="ONE_TIME">One-time address</SelectItem>
              <SelectItem value="*">Any destination</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            value={newMax}
            onChange={(event) => setNewMax(event.target.value)}
            placeholder="USD ceiling"
          />
          <Select
            value={newDecision}
            onValueChange={(value) => setNewDecision(value as PolicyDecision)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="APPROVE">ALLOW (auto-sign)</SelectItem>
              <SelectItem value="REJECT">BLOCK</SelectItem>
              <SelectItem value="REVIEW">2-TIER (hold)</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" onClick={() => void addRule()} disabled={busy === "new"}>
            Submit for approval
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
