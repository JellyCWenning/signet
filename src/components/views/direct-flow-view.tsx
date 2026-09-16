import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FlowSwitch } from "@/components/flow-switch";

export function DirectFlowView() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Path B"
        title="No Fireblocks"
        description="The bot talks to Hyperliquid and Lighter itself. Venue TAP in this app is the only policy. There is no Co-Signer, no Fireblocks TAP, no RSA JWT."
      />
      <FlowSwitch current="direct" />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
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
            Read live margin → this TAP Console → size the top-up → sign with venue keys → settle
            on the venue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-0">
            {RUNTIME.map((stage, index) => (
              <li key={stage.n} className="grid grid-cols-[2.25rem_1fr] gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px]",
                      stage.accent
                        ? "bg-teal-400/20 text-teal-200"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {stage.n}
                  </span>
                  {index < RUNTIME.length - 1 ? (
                    <span className="w-px flex-1 bg-border" aria-hidden />
                  ) : null}
                </div>
                <div className={cn("pb-6", index === RUNTIME.length - 1 && "pb-0")}>
                  <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    {stage.lane}
                  </p>
                  <p className="text-sm font-medium">{stage.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stage.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Hyperliquid</CardDescription>
            <CardTitle className="text-base">Albert · 0x952e…4956</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Bot reads clearinghouseState. If TAP is armed, it deposits USDC with the Hyperliquid
            account / agent wallet on the bot host — not through Fireblocks.
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Lighter</CardDescription>
            <CardTitle className="text-base">Albert · account_index 732041</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Bot reads collateral via REST. If TAP is armed, it transfers with the Lighter API
            key (index 4). Private key stays on the bot host, not in this repo.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>One-time setup</CardTitle>
          <CardDescription>No CSR, no Fireblocks API user, no Co-Signer pairing.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            {SETUP.map((item) => (
              <li key={item.title}>
                <span className="font-medium text-foreground">{item.title}. </span>
                {item.detail}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Fireblocks path:{" "}
        <Link href="/flow" className="text-teal-300 underline-offset-2 hover:underline">
          /flow
        </Link>
      </p>
    </div>
  );
}

const PIPELINE = [
  { n: "1", label: "Read margin", hint: "live HL / Lighter", accent: false },
  { n: "2", label: "Venue TAP", hint: "this Console", accent: true },
  { n: "3", label: "Size transfer", hint: "cap at max", accent: true },
  { n: "4", label: "Venue sign", hint: "HL wallet / Lighter key", accent: true },
  { n: "5", label: "Settle", hint: "on the venue", accent: false },
];

const RUNTIME = [
  {
    n: "1",
    lane: "Bot",
    title: "Read live account state",
    detail:
      "Hyperliquid info API for 0x952e…4956. Lighter GET /api/v1/account?by=index&value=732041. Same feeds the Console already shows.",
    accent: false,
  },
  {
    n: "2",
    lane: "This app",
    title: "Venue TAP is the only policy",
    detail:
      "If remaining margin is above the trigger, stop. If the sized amount is over max single transfer, cap or skip. POST /api/venues/evaluate.",
    accent: true,
  },
  {
    n: "3",
    lane: "Bot",
    title: "Sign with venue-native keys",
    detail:
      "Hyperliquid: account or agent private key. Lighter: API private key for api_key_index 4. Not a Fireblocks RSA JWT. Keys never live in this repo.",
    accent: true,
  },
  {
    n: "4",
    lane: "Venue",
    title: "Deposit or transfer on Hyperliquid / Lighter",
    detail:
      "The venue settles. There is no Fireblocks TAP, no Co-Signer, no MPC enclave, no broadcast from Fireblocks.",
    accent: false,
  },
];

const SETUP = [
  {
    title: "Store venue credentials on the bot host",
    detail:
      "Hyperliquid account address (and agent key if you deposit). Lighter account_index 732041, api_key_index 4, and the matching API secret.",
  },
  {
    title: "Set TAP in this Console",
    detail: "Account margin trigger % and max single transfer USD per Albert account.",
  },
  {
    title: "Fund a treasury wallet the bot can spend",
    detail:
      "USDC (or the venue’s collateral asset) that can move into Hyperliquid / Lighter when TAP is armed.",
  },
];
