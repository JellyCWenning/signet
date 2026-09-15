import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ROWS = [
  {
    tap: "ALLOW",
    callback: "APPROVE",
    meaning: "TAP passed. Callback returns APPROVE and the Co-Signer signs.",
  },
  {
    tap: "BLOCK",
    callback: "REJECT",
    meaning: "TAP denied. Callback returns REJECT and the transaction fails.",
  },
  {
    tap: "2-TIER",
    callback: "RETRY",
    meaning: "No auto-pass. Callback returns RETRY until an operator or the ops bot decides.",
  },
] as const;

export function TapCallbackMap() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Callback → this TAP</CardTitle>
        <CardDescription>
          The Fireblocks API Co-Signer posts to /v2/tx_sign_request. This service evaluates the
          live TAP below — not Fireblocks workspace TAP. First matching enabled rule wins.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {ROWS.map((row) => (
          <div key={row.tap} className="rounded-lg border border-border/80 p-3">
            <p className="font-mono text-xs text-muted-foreground">
              TAP {row.tap} → {row.callback}
            </p>
            <p className="mt-1 text-sm">{row.meaning}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
