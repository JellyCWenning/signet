import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FlowView() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Signing path"
        title="Fireblocks flow"
        description="Custody and signing stay in Fireblocks. This app only decides whether the bot is allowed to create a transfer."
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        {PIPELINE.map((node) => (
          <div
            key={node.label}
            className={cn(
              "rounded-lg border px-3 py-3",
              node.accent ? "border-teal-400/40 bg-teal-400/8" : "border-border/80",
            )}
          >
            <p className="font-mono text-[10px] text-muted-foreground">{node.n}</p>
            <p className="mt-1 text-sm font-medium">{node.label}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{node.hint}</p>
          </div>
        ))}
      </div>

      <Card className="border-teal-400/25">
        <CardHeader>
          <CardTitle>Full path</CardTitle>
          <CardDescription>
            Venue TAP Console → Fireblocks API (RSA JWT) → Fireblocks TAP → Co-Signer MPC →
            broadcast. No callback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-0">
            {RUNTIME.map((stage, index) => (
              <Stage key={stage.n} stage={stage} last={index === RUNTIME.length - 1} />
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        {TAP_BRANCHES.map((row) => (
          <Card key={row.action} size="sm">
            <CardHeader>
              <CardDescription>{row.action}</CardDescription>
              <CardTitle className="text-base">{row.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{row.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Stage({
  stage,
  last,
}: {
  stage: { n: string; lane: string; title: string; detail: string; accent: boolean };
  last: boolean;
}) {
  return (
    <li className="grid grid-cols-[2.25rem_1fr] gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px]",
            stage.accent ? "bg-teal-400/20 text-teal-200" : "bg-muted text-muted-foreground",
          )}
        >
          {stage.n}
        </span>
        {!last ? <span className="w-px flex-1 bg-border" aria-hidden /> : null}
      </div>
      <div className={cn("pb-6", last && "pb-0")}>
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{stage.lane}</p>
        <p className="text-sm font-medium">{stage.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{stage.detail}</p>
      </div>
    </li>
  );
}

const PIPELINE = [
  { n: "1", label: "Venue TAP", hint: "margin + max transfer", accent: true },
  { n: "2", label: "RSA JWT", hint: "Fireblocks API key", accent: false },
  { n: "3", label: "Fireblocks TAP", hint: "ALLOW / BLOCK / 2-TIER", accent: true },
  { n: "4", label: "Cloud share", hint: "MPC in Fireblocks", accent: false },
  { n: "5", label: "Enclave sign", hint: "Co-Signer, callback off", accent: true },
  { n: "6", label: "Broadcast", hint: "signed tx", accent: true },
];

const RUNTIME = [
  {
    n: "1",
    lane: "This app",
    title: "Venue TAP Console",
    detail:
      "Albert Hyperliquid / Lighter. If remaining margin is above the trigger, the bot does not send.",
    accent: true,
  },
  {
    n: "2",
    lane: "Bot",
    title: "POST /v1/transactions to Fireblocks",
    detail:
      "API key UUID + JWT signed with fireblocks_secret.key. Amount capped by max single transfer.",
    accent: false,
  },
  {
    n: "3",
    lane: "Fireblocks TAP",
    title: "Workspace policy",
    detail: "ALLOW continues. BLOCK never reaches the Co-Signer. 2-TIER is human review in Console / mobile.",
    accent: true,
  },
  {
    n: "4",
    lane: "Fireblocks MPC",
    title: "Cloud share + Co-Signer enclave",
    detail:
      "Still required. TAP does not replace MPC. Pair the Signer API user to an API Co-Signer in Fireblocks. Callback off.",
    accent: true,
  },
  {
    n: "5",
    lane: "Done",
    title: "Combined signature is broadcast",
    detail: "This app never sees the signed tx. There is no signing queue here.",
    accent: false,
  },
];

const TAP_BRANCHES = [
  {
    action: "Venue TAP miss",
    title: "Bot does not call Fireblocks",
    detail: "Margin still healthy, or amount over max single transfer.",
  },
  {
    action: "Fireblocks BLOCK",
    title: "Transfer never reaches Co-Signer",
    detail: "Workspace TAP rejected source, dest, asset, or amount.",
  },
  {
    action: "Fireblocks ALLOW",
    title: "Co-Signer signs",
    detail: "Enclave uses its MPC share. Callback is off.",
  },
];
