"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useJson } from "@/hooks/use-json";
import type { FireblocksStatus } from "@/lib/fireblocks-types";
import {
  COSIGNER_KMS_ALIAS,
  COSIGNER_S3,
  FIREBLOCKS_API_USER_ID,
  FIREBLOCKS_WORKSPACE,
  NITRO_PCR8,
  OPS_NEVER,
  OPS_ROLES,
  OPS_STEPS,
  TAP_CONSOLE_PUBLIC_URL,
} from "@/lib/ops";

const STEP_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  operator: { label: "Operator", variant: "default" },
  later: { label: "Later", variant: "outline" },
  done: { label: "Done", variant: "secondary" },
};

export function OpsView() {
  const { data: fbStatus } = useJson<FireblocksStatus>("/api/fireblocks/credentials", 8000);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Do not mix"
        title="Ops split"
        description="This Tokyo desk is venue TAP and the Fireblocks API JWT. The Nitro Co-Signer in Virginia holds the customer MPC share. Fireblocks SaaS holds the other share and workspace TAP."
        actions={
          <Button nativeButton={false} render={<Link href="/policy" />}>
            Paste JWT on /policy
          </Button>
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        {OPS_ROLES.map((machine) => (
          <Card key={machine.id} className={machine.id === "tap-console" ? "border-teal-400/30" : undefined}>
            <CardHeader>
              <CardDescription>{machine.where}</CardDescription>
              <CardTitle className="text-base">{machine.role}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Stores: </span>
                {machine.stores}
              </p>
              <p>
                <span className="text-muted-foreground">Never: </span>
                {machine.neverStores}
              </p>
              {machine.instance ? (
                <p className="font-mono text-[11px] text-muted-foreground">{machine.instance}</p>
              ) : null}
              {machine.publicHint ? (
                <p className="font-mono text-[11px] break-all text-muted-foreground">{machine.publicHint}</p>
              ) : null}
              {machine.iam ? (
                <p className="text-xs text-muted-foreground">IAM {machine.iam}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border-amber-400/35">
        <CardHeader>
          <CardDescription>Blocker</CardDescription>
          <CardTitle className="text-base">Owner must approve the MPC key-share</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Workspace: {FIREBLOCKS_WORKSPACE}. Paired API user{" "}
            <span className="font-mono text-foreground">{FIREBLOCKS_API_USER_ID}</span>. Callback is off.
          </p>
          <p>
            Until the Owner approves the share in the Fireblocks mobile app (120 hours), ALLOW
            transfers cannot auto-sign. This page cannot do that approval.
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>This desk (Tokyo)</CardDescription>
            <CardTitle className="text-base">Fireblocks JWT</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {fbStatus?.configured ? (
              <p>
                Connected (…{fbStatus.apiKeyLast4}
                {fbStatus.fromEnv ? ", from env" : ", pasted in memory"}). Ping from{" "}
                <Link href="/policy" className="text-teal-300 underline-offset-2 hover:underline">
                  Fireblocks TAP
                </Link>
                .
              </p>
            ) : (
              <p>
                No API key on this process yet. Paste UUID + RSA PEM on{" "}
                <Link href="/policy" className="text-teal-300 underline-offset-2 hover:underline">
                  /policy
                </Link>
                , or set <span className="font-mono">FIREBLOCKS_API_KEY</span> /{" "}
                <span className="font-mono">FIREBLOCKS_SECRET_KEY</span> in{" "}
                <span className="font-mono">/opt/tap-console/.env.local</span>.
              </p>
            )}
            <p>
              Live URL{" "}
              <a
                href={TAP_CONSOLE_PUBLIC_URL}
                className="font-mono text-teal-300 underline-offset-2 hover:underline"
              >
                {TAP_CONSOLE_PUBLIC_URL}
              </a>{" "}
              (HTTP only).
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Virginia Nitro (not this app)</CardDescription>
            <CardTitle className="text-base">PCR8 must match Global</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p className="break-all font-mono text-[11px] text-foreground">{NITRO_PCR8}</p>
            <p>
              S3 <span className="font-mono text-foreground">{COSIGNER_S3}</span> · KMS{" "}
              <span className="font-mono">{COSIGNER_KMS_ALIAS}</span>
            </p>
            <p>
              Console Access Denied on that bucket is expected: Deny *, role{" "}
              <span className="font-mono">fireblocks-nitro-cosigner</span> only. Encrypted shard DB.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Remaining operator steps</CardTitle>
          <CardDescription>In order. This desk cannot approve the mobile key-share.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {OPS_STEPS.map((step, index) => {
              const badge = STEP_BADGE[step.status];
              return (
                <li key={step.id} className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[11px] text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{step.title}</p>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{step.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Do not</CardTitle>
          <CardDescription>These mix the two machines or expose the shard DB.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {OPS_NEVER.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
