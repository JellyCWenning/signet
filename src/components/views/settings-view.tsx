"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FireblocksCredentialsCard } from "@/components/fireblocks-credentials-card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useJson } from "@/hooks/use-json";
import type { FireblocksStatus } from "@/lib/fireblocks-types";
import type { DashboardStats, WorkspaceSettings } from "@/lib/types";

export function SettingsView({
  initial,
}: {
  initial: {
    settings: WorkspaceSettings;
    stats: DashboardStats;
  };
}) {
  const router = useRouter();
  const { data, setData } = useJson("/api/workspace", 4000, initial);
  const { data: fbStatus, setData: setFbStatus } = useJson<FireblocksStatus>(
    "/api/fireblocks/credentials",
    8000,
  );

  async function reset() {
    const response = await fetch("/api/workspace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    const body = await response.json();
    if (!response.ok) {
      toast.error("Unable to reset");
      return;
    }
    toast.success("Thresholds restored to Albert defaults");
    setData(body);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Connect Fireblocks here or on the Fireblocks TAP page. This app does not host a Co-Signer."
      />

      <FireblocksCredentialsCard status={fbStatus} onChange={setFbStatus} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fireblocks Co-Signer (MPC)</CardTitle>
            <CardDescription>
              TAP is policy. Auto-sign still needs Fireblocks MPC: a Signer API user paired to an
              API Co-Signer. This app does not run that machine.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Do not configure a Callback Handler URL. If none is set, TAP-allowed requests are
            signed in the enclave. Machine inventory and remaining operator steps:{" "}
            <Link href="/ops" className="text-teal-300 underline-offset-2 hover:underline">
              Ops
            </Link>
            .
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bot API auth</CardTitle>
            <CardDescription>
              POST /v1/transactions needs the API key UUID plus a JWT signed with the RSA private
              key. Operator: {data?.settings.operatorName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" onClick={() => void reset()}>
              Reset Albert TAP defaults
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
