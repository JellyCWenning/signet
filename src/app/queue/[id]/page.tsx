"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useJson } from "@/hooks/use-json";
import {
  formatAmount,
  formatTimestamp,
  formatUsd,
  kindLabel,
  truncateAddress,
} from "@/lib/format";
import type { CallbackAction, SignRequest } from "@/lib/types";

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, error, loading, reload } = useJson<SignRequest>(`/api/queue/${id}`, 2000);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<CallbackAction | null>(null);

  async function decide(action: Extract<CallbackAction, "APPROVE" | "REJECT" | "IGNORE">) {
    setBusy(action);
    try {
      const response = await fetch(`/api/queue/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, reason: reason || undefined }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Decision failed");
      toast.success(`Returned ${action} to the Co-Signer`);
      await reload();
      router.refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Decision failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading && !data) {
    return <p className="text-sm text-muted-foreground">Loading request…</p>;
  }
  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">{error ?? "Request not found"}</p>
        <Button nativeButton={false} variant="outline" render={<Link href="/queue" />}>
          Back to queue
        </Button>
      </div>
    );
  }

  const pending = data.status === "pending";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={kindLabel(data.kind)}
        title={
          data.kind === "config_change"
            ? data.configType?.replace(/_/g, " ") ?? "Configuration change"
            : `${formatAmount(data.amount, data.assetId)}`
        }
        description={
          data.kind === "config_change"
            ? (data.extraInfo?.summary as string)
            : `${data.sourceName ?? "Source"} → ${data.destName ?? truncateAddress(data.destAddress)}`
        }
        actions={<StatusBadge status={data.status} />}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Request</CardTitle>
            <CardDescription>
              Fields the API Co-Signer posts to{" "}
              {data.kind === "config_change"
                ? "/v2/config_change_sign_request"
                : "/v2/tx_sign_request"}
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Fact label="Request ID" value={data.id} mono />
              <Fact label="Transaction ID" value={data.txId ?? "—"} mono />
              <Fact label="External ID" value={data.externalTxId ?? "—"} mono />
              <Fact label="Operation" value={data.operation ?? data.configType ?? "—"} />
              <Fact label="USD value" value={formatUsd(data.amountUsd, true)} />
              <Fact label="Fee" value={data.fee ?? "—"} />
              <Fact label="Source" value={`${data.sourceName ?? "—"} (${data.sourceId ?? data.sourceType ?? "—"})`} />
              <Fact
                label="Destination"
                value={`${data.destName ?? "—"} · ${data.destType ?? "—"}`}
              />
              <Fact label="Address" value={data.destAddress ?? "—"} mono />
              <Fact label="Address type" value={data.destAddressType ?? "—"} />
              <Fact label="API user" value={data.signerId} mono />
              <Fact label="Co-signer" value={data.cosignerId} mono />
              <Fact label="Received" value={formatTimestamp(data.createdAt)} />
              <Fact
                label="Note"
                value={data.note ?? (data.extraInfo?.summary as string) ?? "—"}
              />
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Policy</CardTitle>
              <CardDescription>
                First matching enabled rule decides auto-sign, auto-reject, or hold.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Fact label="Matched rule" value={data.matchedRuleName ?? "Default hold"} />
              <Fact label="Verdict" value={data.policyVerdict ?? "REVIEW"} />
              <Fact
                label="Decision source"
                value={data.decisionSource ?? (pending ? "waiting on operator" : "—")}
              />
              {data.rejectionReason ? (
                <Fact label="Reason" value={data.rejectionReason} />
              ) : null}
              {data.operator ? <Fact label="Operator" value={data.operator} /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Co-sign</CardTitle>
              <CardDescription>
                {pending
                  ? "The callback is returning RETRY until you decide. Fireblocks retries the same requestId."
                  : "This request already has a terminal callback action."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Rejection or ignore reason (written to the audit log)"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={!pending}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void decide("APPROVE")}
                  disabled={!pending || busy !== null}
                >
                  {busy === "APPROVE" ? "Signing…" : "Approve & sign"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void decide("REJECT")}
                  disabled={!pending || busy !== null}
                >
                  {busy === "REJECT" ? "Rejecting…" : "Reject"}
                </Button>
                {data.kind !== "tx_sign" ? (
                  <Button
                    variant="outline"
                    onClick={() => void decide("IGNORE")}
                    disabled={!pending || busy !== null}
                  >
                    Ignore
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className={mono ? "truncate font-mono text-xs" : "truncate text-sm"}>
        {value}
      </dd>
    </div>
  );
}
