"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { RequestTable } from "@/components/request-table";
import { HealthDot } from "@/components/status-badge";
import { useJson } from "@/hooks/use-json";
import { enclaveLabel } from "@/lib/format";
import type { ApiUser, Cosigner, DashboardStats, SignRequest, WorkspaceSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function OverviewView({
  initialWorkspace,
  initialQueue,
}: {
  initialWorkspace: {
    settings: WorkspaceSettings;
    stats: DashboardStats;
    cosigners: Cosigner[];
    apiUsers?: ApiUser[];
  };
  initialQueue: SignRequest[];
}) {
  const workspace = useJson("/api/workspace", 2500, initialWorkspace);
  const queue = useJson<SignRequest[]>("/api/queue?status=auto_approved", 2500, initialQueue);

  const stats = workspace.data?.stats;
  const signed = queue.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Co-sign desk"
        description="Pair a Signer API bot to a Co-Signer. Fireblocks TAP is the only policy. Callback is off — the enclave signs what TAP already allowed."
        actions={
          <div className="flex gap-2">
            <Button nativeButton={false} variant="outline" render={<Link href="/flow" />}>
              Full path
            </Button>
            <Button nativeButton={false} render={<Link href="/queue" />}>
              Open queue
            </Button>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>1. Identity</CardDescription>
            <CardTitle className="text-base">API key + RSA JWT</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              The bot signs every POST /v1/transactions with fireblocks_secret.key. The API key UUID alone cannot create a transfer.
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>2. Pair + TAP</CardDescription>
            <CardTitle className="text-base">Co-Signer and Console TAP</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Pair the Signer user to a Co-Signer with no callback URL. ALLOW that user as designated signer in Policy Editor.
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>3. Co-Signer</CardDescription>
            <CardTitle className="text-base">Enclave signs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              No callback round-trip. The Co-Signer uses its enclave key share as soon as TAP has allowed the tx.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Awaiting review"
          value={stats?.pending ?? "—"}
          hint="Nothing waits here; TAP holds live in Console"
        />
        <StatCard
          label="Auto-signed 24h"
          value={stats?.autoSigned24h ?? "—"}
          hint="Enclave signed after TAP ALLOW"
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
            <CardTitle>Recently signed</CardTitle>
            <CardDescription>
              Transfers the Co-Signer already signed after Fireblocks TAP allowed them.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {queue.loading && !queue.data ? (
              <p className="px-4 py-10 text-sm text-muted-foreground">Loading queue…</p>
            ) : (
              <RequestTable
                requests={signed}
                emptyTitle="No signatures yet"
                emptyDescription="TAP-allowed signatures from the paired Co-Signer land here."
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
                    {cosigner.pairedApiUser} · {cosigner.role} · callback off
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
