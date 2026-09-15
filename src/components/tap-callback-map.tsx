import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ROWS = [
  {
    tap: "ALLOW",
    meaning: "TAP passed. Co-Signer signs in the enclave. No callback.",
  },
  {
    tap: "BLOCK",
    meaning: "TAP denied. The transaction never reaches the Co-Signer.",
  },
  {
    tap: "2-TIER",
    meaning: "Human review in the Fireblocks Console / mobile app — not this desk.",
  },
] as const;

export function TapCallbackMap() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fireblocks TAP</CardTitle>
        <CardDescription>
          Workspace TAP is the only policy. Callback is off, so ALLOW goes straight to the enclave.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {ROWS.map((row) => (
          <div key={row.tap} className="rounded-lg border border-border/80 p-3">
            <p className="font-mono text-xs text-muted-foreground">TAP {row.tap}</p>
            <p className="mt-1 text-sm">{row.meaning}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
