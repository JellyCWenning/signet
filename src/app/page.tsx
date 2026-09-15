"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { RequestTable } from "@/components/request-table";
import { HealthDot } from "@/components/status-badge";
import { useJson } from "@/hooks/use-json";
import { enclaveLabel } from "@/lib/format";
import type { Cosigner, DashboardStats, SignRequest, WorkspaceSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";

export default function OverviewPage() {
  const workspace = useJson<{
    settings: WorkspaceSettings;
    stats: DashboardStats;
    cosigners: Cosigner[];
  }>("/api/workspace");
  const queue = useJson<SignRequest[]>("/api/queue?status=pending");

  const stats = workspace.data?.stats;
  const pending = queue.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Co-sign desk"
        description="Review held signing requests, watch auto-signed treasury flow, and keep the API Co-Signer callback handler in the loop."
        actions={
          <Button nativeButton={false} render={<Link href="/queue" />}>
            Open queue
          </Button>
        }
      />

      {workspace.error ? (
        <p className="text-sm text-destructive">{workspace.error}</p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Awaiting review"
          value={stats?.pending ?? "—"}
          hint="Held by policy for an operator"
        />
        <StatCard
          label="Auto-signed 24h"
          value={stats?.autoSigned24h ?? "—"}
          hint="Callback returned APPROVE"
        />
        <StatCard
          label="Rejected 24h"
          value={stats?.rejected24h ?? "—"}
          hint="Policy or operator REJECT"
        />
        <StatCard
          label="Co-signers"
          value={
            stats
              ? `${stats.onlineCosigners}/${stats.totalCosigners}`
              : "—"
          }
          hint="Enclaves reporting healthy"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Held for review</CardTitle>
            <CardDescription>
              These callbacks returned RETRY. Decide them before Fireblocks exhausts retries.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {queue.loading && !queue.data ? (
              <p className="px-4 py-10 text-sm text-muted-foreground">Loading queue…</p>
            ) : (
              <RequestTable
                requests={pending}
                emptyTitle="Nothing waiting"
                emptyDescription="New callbacks that policy cannot auto-sign will appear here."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Co-signer fleet</CardTitle>
            <CardDescription>
              Paired API users that participate in MPC signing for this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(workspace.data?.cosigners ?? []).map((cosigner) => (
              <div key={cosigner.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{cosigner.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {enclaveLabel(cosigner.enclave)} · {cosigner.region}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cosigner.pairedApiUser} · {cosigner.role}
                    {cosigner.callbackConfigured ? " · callback on" : " · no callback"}
                  </p>
                </div>
                <div className="text-right">
                  <HealthDot status={cosigner.status} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cosigner.signed24h} signed
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-heading text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
