"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
  const { data: fbStatus } = useJson<FireblocksStatus>("/api/fireblocks/credentials", 8000);

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
        description="Venue TAP defaults live here. Fireblocks TAP and RSA do not."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fireblocks TAP</CardTitle>
            <CardDescription>
              ALLOW / BLOCK / 2-TIER and designated signer are workspace policy.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Edit them in{" "}
            <a
              href="https://console.fireblocks.io"
              className="text-teal-300 underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              console.fireblocks.io
            </a>{" "}
            → Settings → Policy Editor. This HTTP site does not accept TAP drafts or RSA PEMs.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bot JWT</CardTitle>
            <CardDescription>
              {fbStatus?.configured
                ? `Host env loaded (…${fbStatus.apiKeyLast4})`
                : "Host env not loaded"}
              {data?.settings.operatorName ? ` · operator ${data.settings.operatorName}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              RSA is only on the Tokyo host in <span className="font-mono">/opt/tap-console/.env.local</span>.
              Restart tap-console after changing it.
            </p>
            <Button type="button" variant="outline" onClick={() => void reset()}>
              Reset Albert TAP defaults
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
