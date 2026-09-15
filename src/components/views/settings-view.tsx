"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthDot } from "@/components/status-badge";
import { useJson } from "@/hooks/use-json";
import { enclaveLabel } from "@/lib/format";
import type { Cosigner, DashboardStats, WorkspaceSettings } from "@/lib/types";

export function SettingsView({
  initial,
}: {
  initial: {
    settings: WorkspaceSettings;
    stats: DashboardStats;
    cosigners: Cosigner[];
  };
}) {
  const router = useRouter();
  const { data, setData } = useJson("/api/workspace", 2500, initial);

  async function reset() {
    const response = await fetch("/api/workspace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    const body = await response.json();
    if (!response.ok) {
      toast.error("Unable to reset workspace");
      return;
    }
    toast.success("Demo workspace restored");
    setData(body);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Co-Signer settings"
        description="Callback is off. Pair the bot to the Co-Signer; Fireblocks TAP is the only policy. The enclave signs without posting here."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Callback</CardTitle>
            <CardDescription>
              Do not set a callback URL on the Co-Signer. TAP-allowed requests are signed in the enclave immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-sm text-muted-foreground">
              Fireblocks docs: if no Callback Handler is configured for a paired API user, the
              Co-Signer automatically signs or approves every request it receives for that user.
            </p>
            <p className="text-xs text-muted-foreground">
              On the Co-Signer host: skip callback during <code className="font-mono text-teal-300">add-user</code>,
              or leave the callback URL empty. This desk does not need{" "}
              <code className="font-mono">/v2/tx_sign_request</code>.
            </p>
            <p className="text-xs text-muted-foreground">
              Operator: {data?.settings.operatorName}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo data</CardTitle>
            <CardDescription>
              The queue lives in memory for this process. Resetting restores the seeded Northstar
              treasury traffic.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" onClick={() => void reset()}>
              Reset workspace
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paired Co-Signers</CardTitle>
          <CardDescription>
            Each Co-Signer holds an MPC key share inside an enclave (SGX, Nitro, or Confidential Space).
            With callback off, TAP-allowed txs are signed there without a round-trip to this app.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {(data?.cosigners ?? []).map((cosigner) => (
            <div key={cosigner.id} className="rounded-lg border border-border/80 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{cosigner.name}</p>
                <HealthDot status={cosigner.status} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {enclaveLabel(cosigner.enclave)} · {cosigner.region}
              </p>
              <p className="text-xs text-muted-foreground">
                {cosigner.pairedApiUser} · {cosigner.role}
              </p>
              <p className="text-xs text-muted-foreground">callback off</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
