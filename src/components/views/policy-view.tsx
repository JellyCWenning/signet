import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TapCallbackMap } from "@/components/tap-callback-map";

export function PolicyView() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transaction Authorization Policy"
        title="Fireblocks TAP"
        description="Edit Fireblocks TAP in the Console Policy Editor. Trigger thresholds for Hyperliquid, Lighter, and MEXC live in TAP Console."
      />

      <Card>
        <CardHeader>
          <CardTitle>Venue trigger TAP</CardTitle>
          <CardDescription>
            Account margin and max single transfer are edited in{" "}
            <Link href="/console" className="text-teal-300 underline-offset-2 hover:underline">
              TAP Console
            </Link>
            . Those gates run before the bot posts a Fireblocks transfer.
          </CardDescription>
        </CardHeader>
      </Card>

      <TapCallbackMap />

      <Card className="border-teal-400/25">
        <CardHeader>
          <CardTitle>How to change TAP</CardTitle>
          <CardDescription>
            Prefer the Console. Docs:{" "}
            <a
              className="text-teal-300 underline-offset-2 hover:underline"
              href="https://developers.fireblocks.com/docs/set-transaction-authorization-policy"
              target="_blank"
              rel="noreferrer"
            >
              Set Policies
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Console (recommended)</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>
                Fireblocks Console → Settings → Policy Editor (Transaction Authorization Policy).
              </li>
              <li>
                Rules match top to bottom. Put strict rules first (for example BLOCK one-time
                addresses), then ALLOW (amount caps, allowlists, internal vaults).
              </li>
              <li>
                Actions are ALLOW (paired Co-Signer signs), BLOCK (reject), or 2-TIER (human
                review in Console / mobile — not this desk).
              </li>
              <li>
                After save, Owner / Admin get Review Policy changes and must confirm on the
                Fireblocks mobile app before the policy goes live.
              </li>
            </ol>
          </div>
          <div>
            <p className="font-medium text-foreground">API (Policy Editor V2)</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                Read:{" "}
                <code className="font-mono text-teal-300">
                  GET /v1/policy/active_policy?policyType=TRANSFER
                </code>
              </li>
              <li>
                Update draft: <code className="font-mono text-teal-300">PUT /v1/policy/draft</code>{" "}
                (policyTypes + rules)
              </li>
              <li>
                Publish: <code className="font-mono text-teal-300">POST /v1/policy/draft</code>{" "}
                (draft id)
              </li>
            </ul>
            <p className="mt-2">
              Auth is API key + RSA private key signing a JWT — the key UUID alone is not enough.
              Role must be Owner / Admin / Non-Signing Admin. A Signer bot cannot read TAP.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Enclave</CardDescription>
            <CardTitle className="text-base">Where the customer key share lives</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              The Co-Signer runs in SGX / Nitro / Confidential Space. With callback off, TAP-allowed
              transfers are signed there immediately.
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Callback</CardDescription>
            <CardTitle className="text-base">Off</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              The Co-Signer does not POST this app. Pairing is still required, or the enclave will
              not sign for that API user.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
