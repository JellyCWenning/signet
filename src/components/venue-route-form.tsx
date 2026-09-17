"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type RouteMethod = "hyperliquidToLighter" | "lighterToHyperliquid";

const DIRECTIONS: Array<{
  id: RouteMethod;
  label: string;
  hops: string;
  defaultAmount: string;
  hint: string;
}> = [
  {
    id: "hyperliquidToLighter",
    label: "Hyperliquid → Lighter",
    hops: "Hyperliquid → vault → Relay depositErc20 → Lighter",
    defaultAmount: "2",
    hint: "If the vault already holds USDC, only the Relay hop runs. Hyperliquid charges $1 extra only when it has to withdraw.",
  },
  {
    id: "lighterToHyperliquid",
    label: "Lighter → Hyperliquid",
    hops: "Lighter → vault → Hyperliquid Bridge2",
    defaultAmount: "8",
    hint: "Relay takes $1 L2 gas. Bridge2 min is 5 USDC, so send about 6 or more (8 was proven live).",
  },
];

interface RouteStep {
  kind: string;
  status: string;
  txId?: string;
  txHash?: string;
}

interface RouteResult {
  ok?: boolean;
  railId?: string;
  amount?: string;
  steps?: RouteStep[];
  error?: string;
}

export function VenueRouteForm({
  disabled,
  onRouted,
}: {
  disabled?: boolean;
  onRouted?: () => void;
}) {
  const [method, setMethod] = useState<RouteMethod>("hyperliquidToLighter");
  const [amount, setAmount] = useState("2");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);

  const direction = useMemo(
    () => DIRECTIONS.find((item) => item.id === method) ?? DIRECTIONS[0],
    [method],
  );

  function pickMethod(next: RouteMethod) {
    const nextDirection = DIRECTIONS.find((item) => item.id === next);
    const currentDefault = DIRECTIONS.find((item) => item.id === method)?.defaultAmount;
    setMethod(next);
    if (!amount.trim() || amount === currentDefault) {
      setAmount(nextDirection?.defaultAmount ?? amount);
    }
  }

  async function submit() {
    const value = amount.trim();
    if (!value || Number(value) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (method === "lighterToHyperliquid" && Number(value) < 6) {
      toast.error("Lighter → Hyperliquid needs about 6+ USDC so hop 2 still meets the Bridge2 min of 5 after $1 L2 gas");
      return;
    }
    const confirmed = window.confirm(
      `Send ${value} USDC ${direction.label} via the Fireblocks vault?\n\nThis is live USDC. The Co-Signer will auto-sign if Fireblocks TAP ALLOWs.`,
    );
    if (!confirmed) return;

    setBusy(true);
    setResult(null);
    toast.message(`${direction.label} · ${value} USDC via vault…`);
    try {
      const response = await fetch("/api/fireblocks/route", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          method,
          amount: value,
          note: `TAP Console UI · ${method}`,
        }),
      });
      const body = (await response.json()) as RouteResult;
      if (!response.ok) throw new Error(body.error ?? "Unable to route funds");
      setResult(body);
      const hops = (body.steps ?? []).map((step) => step.kind).join(" → ") || "ok";
      toast.success(`${direction.label} completed`, { description: hops });
      onRouted?.();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to route funds";
      setResult({ ok: false, error: message });
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Direction</span>
        <select
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={method}
          disabled={disabled || busy}
          onChange={(event) => pickMethod(event.target.value as RouteMethod)}
        >
          {DIRECTIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-muted-foreground">{direction.hops}</p>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Amount (USDC)</span>
        <Input
          inputMode="decimal"
          value={amount}
          disabled={disabled || busy}
          onValueChange={setAmount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>
      <p className="text-[11px] text-muted-foreground">{direction.hint}</p>
      <Button type="button" disabled={disabled || busy} onClick={() => void submit()}>
        {busy ? "Routing via vault…" : `Send ${direction.label}`}
      </Button>
      {result ? (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            result.ok
              ? "border-teal-400/40 bg-teal-400/10 text-teal-50"
              : "border-destructive/40 bg-destructive/10 text-destructive",
          )}
        >
          {result.error ? (
            result.error
          ) : (
            <div className="space-y-1">
              <p>
                {direction.label} {result.amount} USDC
                {result.railId ? ` · rail ${result.railId}` : ""}
              </p>
              {(result.steps ?? []).map((step, index) => (
                <p key={`${step.kind}-${index}`} className="text-xs text-muted-foreground">
                  {step.kind} · {step.status}
                  {step.txId ? ` · ${step.txId.slice(0, 8)}…` : ""}
                  {step.txHash ? ` · ${step.txHash.slice(0, 10)}…` : ""}
                </p>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
