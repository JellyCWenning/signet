import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FlowView() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="End to end"
        title="From transfer request to signed transaction"
        description="Callback is off. Fireblocks TAP is the only policy. After TAP allows the transfer, the Co-Signer signs inside its enclave."
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
            Identity (API key + RSA JWT) → TAP → cloud share + enclave share → broadcast. No
            local TAP. No callback round-trip.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <ol className="min-w-[52rem] space-y-0">
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

      <div className="grid gap-3 md:grid-cols-3">
        {TAP_BRANCHES.map((row) => (
          <Card key={row.action} size="sm">
            <CardHeader>
              <CardDescription>TAP {row.action}</CardDescription>
              <CardTitle className="text-base">{row.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{row.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What an enclave is</CardTitle>
          <CardDescription>
            Not a second TAP. It is the isolated machine that holds the customer MPC key share.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Fireblocks uses MPC: one key share stays in Fireblocks cloud, one share stays with you.
            Your share runs in a hardware-isolated environment called an enclave (Intel SGX, AWS
            Nitro, or GCP Confidential Space). Code inside can sign. The share cannot be copied
            out.
          </p>
          <p>
            With callback off, the enclave signs as soon as it is asked. TAP is still the only
            gate that decides whether that request is sent at all.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>One-time setup (before the bot can send)</CardTitle>
          <CardDescription>
            The API key identifies the bot. The RSA private key proves every HTTP call is from
            that bot. Fireblocks never stores the private key.
          </CardDescription>
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
    </div>
  );
}

const PIPELINE = [
  { n: "1", label: "RSA JWT", hint: "API key + private key", accent: false },
  { n: "2", label: "POST transfer", hint: "asset, source, dest, amount", accent: false },
  { n: "3", label: "Fireblocks TAP", hint: "ALLOW / BLOCK / 2-TIER", accent: true },
  { n: "4", label: "Cloud share", hint: "MPC in Fireblocks", accent: false },
  { n: "5", label: "Enclave sign", hint: "callback off", accent: true },
  { n: "6", label: "Broadcast", hint: "signed tx on chain", accent: true },
];

const RUNTIME = [
  {
    n: "1",
    lane: "Bot identity",
    title: "Sign a JWT with the RSA private key",
    detail:
      "The API key is only the user id. Each POST /v1/transactions must carry X-API-Key plus Authorization: Bearer <JWT signed RS256 with fireblocks_secret.key>.",
    accent: false,
  },
  {
    n: "2",
    lane: "Create transfer",
    title: "Bot submits TRANSFER to Fireblocks",
    detail:
      "Required fields: assetId, source, destination, amount. Use externalTxId so retries do not double-send.",
    accent: false,
  },
  {
    n: "3",
    lane: "Fireblocks TAP",
    title: "Workspace TAP is the only policy",
    detail:
      "Matches source, destination, asset, and amount. First matching rule wins. BLOCK never reaches the Co-Signer. 2-TIER waits on Console / mobile. ALLOW continues.",
    accent: true,
  },
  {
    n: "4",
    lane: "Fireblocks cloud",
    title: "Cloud MPC share prepares to sign",
    detail: "Only TAP-allowed transactions are sent to the API Co-Signer paired to this Signer bot.",
    accent: false,
  },
  {
    n: "5",
    lane: "API Co-Signer · Enclave",
    title: "Enclave signs without a callback",
    detail:
      "Callback is off. The Co-Signer uses its enclave key share immediately. Pairing is still required or this API user has no share to sign with.",
    accent: true,
  },
  {
    n: "6",
    lane: "Complete sign",
    title: "Shares combine and the signed tx is broadcast",
    detail: "Cloud share + enclave share → signed transaction → Fireblocks broadcasts.",
    accent: true,
  },
];

const TAP_BRANCHES = [
  {
    action: "ALLOW",
    title: "Co-Signer signs",
    detail: "Designated signer must be this paired API user. Enclave signs. No callback.",
  },
  {
    action: "BLOCK",
    title: "Request fails",
    detail: "The transfer never reaches the Co-Signer. The bot sees a TAP rejection.",
  },
  {
    action: "2-TIER",
    title: "Human in Console",
    detail: "Review happens in the Fireblocks Console and mobile app — not this desk.",
  },
];

const SETUP = [
  {
    title: "Generate RSA 4096 on your machine",
    detail:
      "openssl req -new -newkey rsa:4096 -nodes -keyout fireblocks_secret.key -out fireblocks.csr. Keep the .key file. Upload only the .csr.",
  },
  {
    title: "Create a Signer API user",
    detail:
      "Console → Developer Center → API Users → Add API user. Role Signer. Upload fireblocks.csr. After approval you receive the API key UUID.",
  },
  {
    title: "Pair the API user to an API Co-Signer",
    detail:
      "Do not set a Callback Handler URL. If none is configured, TAP-allowed requests are signed automatically.",
  },
  {
    title: "Edit TAP in the Console",
    detail:
      "Settings → Policy Editor. ALLOW this bot as designated signer for the vaults, destinations, and amounts it may move. Owner / Admin approve on the mobile app.",
  },
];
