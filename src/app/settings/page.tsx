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

export default function SettingsPage() {
  const router = useRouter();
  const { data, reload } = useJson<{
    settings: WorkspaceSettings;
    stats: DashboardStats;
    cosigners: Cosigner[];
  }>("/api/workspace");

  async function reset() {
    const response = await fetch("/api/workspace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    if (!response.ok) {
      toast.error("Unable to reset workspace");
      return;
    }
    toast.success("Demo workspace restored");
    await reload();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Callback handler settings"
        description="This demo speaks the Fireblocks Co-Signer callback contract. Pair it with an API user, or use Simulate callback to exercise policy without a live enclave."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Endpoints</CardTitle>
            <CardDescription>
              The Co-Signer appends these paths to the callback URL you configure on the API user.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Endpoint
              method="POST"
              path="/v2/tx_sign_request"
              detail="Transaction signing and approval. Respond with APPROVE, REJECT, RETRY, or IGNORE."
            />
            <Endpoint
              method="POST"
              path="/v2/config_change_sign_request"
              detail="Workspace configuration approvals such as POLICY_APPROVAL and ENABLE_ONE_TIME_ADDRESS."
            />
            <p className="text-xs text-muted-foreground">
              Auth mode: {data?.settings.callbackAuth === "jwt" ? "JWT (RS256)" : "JSON (demo)"}.
              Production handlers should verify the Co-Signer JWT and sign the response. This
              workspace accepts JSON so you can run it without secrets.
            </p>
            <p className="text-xs text-muted-foreground">
              Operator acting on holds: {data?.settings.operatorName}
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
            <Button variant="outline" onClick={() => void reset()}>
              Reset workspace
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paired Co-Signers</CardTitle>
          <CardDescription>
            Each Co-Signer hosts an MPC key share in an enclave and calls this handler before it
            participates in a signature.
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
              <p className="text-xs text-muted-foreground">
                Callback {cosigner.callbackConfigured ? "configured" : "not configured"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Endpoint({
  method,
  path,
  detail,
}: {
  method: string;
  path: string;
  detail: string;
}) {
  return (
    <div>
      <p className="font-mono text-xs">
        <span className="text-teal-300">{method}</span> {path}
      </p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
