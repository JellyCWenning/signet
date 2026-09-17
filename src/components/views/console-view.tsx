"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { VenueRouteForm } from "@/components/venue-route-form";
import { useJson } from "@/hooks/use-json";
import type { FireblocksStatus } from "@/lib/fireblocks-types";
import { formatTimestamp, formatUsd } from "@/lib/format";
import type { TransferTapDecision, VenueSnapshot } from "@/lib/venues";
import { cn } from "@/lib/utils";

interface ConsolePayload {
  venues: VenueSnapshot[];
  armedCount: number;
}

export function ConsoleView({ initial }: { initial: ConsolePayload }) {
  const { data, error, loading, setData, reload } = useJson<ConsolePayload>(
    "/api/venues",
    8000,
    initial,
  );
  const venues = data?.venues ?? [];
  const { data: fbStatus } = useJson<FireblocksStatus>("/api/fireblocks/credentials", 8000);
  const [refreshing, setRefreshing] = useState(false);

  async function refreshBalances() {
    setRefreshing(true);
    toast.message("Refreshing Hyperliquid and Lighter…");
    try {
      const next = await reload();
      if (!next) throw new Error("Refresh failed");
      toast.success(
        `Balances updated · ${next.venues
          .map((item) => `${item.name} ${item.live.marginRatioPct.toFixed(1)}%`)
          .join(" · ")}`,
      );
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  const lastSynced = venues[0]?.lastSyncedAt;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="TAP Console"
        title="Trigger thresholds"
        description="Set margin trigger against live Hyperliquid / Lighter balances. Manual HL ↔ Lighter USDC goes through the vault panel, not venue TAP."
        actions={
          <div className="flex flex-col items-end gap-1">
            <Button type="button" variant="outline" disabled={refreshing} onClick={() => void refreshBalances()}>
              {refreshing ? "Refreshing…" : "Refresh balances"}
            </Button>
            {lastSynced ? (
              <p className="text-[11px] text-muted-foreground">Synced {formatTimestamp(lastSynced)}</p>
            ) : null}
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Accounts"
          value={venues.length}
          hint="Fireblocks Hyperliquid · Fireblocks Lighter"
        />
        <SummaryCard
          label="Armed now"
          value={data?.armedCount ?? 0}
          hint="Margin at or below trigger"
        />
        <SummaryCard
          label="Suggested top-ups"
          value={formatUsd(venues.reduce((sum, item) => sum + item.suggestedTransferUsd, 0))}
          hint="Capped at each venue max transfer"
        />
      </section>

      <Card>
        <CardHeader className="border-b">
          <CardDescription>Live USDC · via Fireblocks vault 3</CardDescription>
          <CardTitle>HL ↔ Lighter</CardTitle>
          <p className="text-xs text-muted-foreground">
            Manual venue-to-venue. Pick a direction and amount; it always goes through the Fireblocks
            vault. Do not ERC20 TRANSFER to Relay `0x4cd00e…` or to catalog dest `0xa95d9c1f…`.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          {fbStatus?.configured ? (
            <VenueRouteForm disabled={refreshing} onRouted={() => void reload()} />
          ) : (
            <p className="text-xs text-muted-foreground">
              Fireblocks JWT is not loaded from host env. Set FIREBLOCKS_API_KEY and
              FIREBLOCKS_SECRET_KEY in /opt/tap-console/.env.local, then restart tap-console.
            </p>
          )}
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading TAP Console…</p>
      ) : venues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No venues configured.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {venues.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              onUpdate={(next) => {
                setData({
                  venues: venues.map((item) => (item.id === next.id ? next : item)),
                  armedCount: venues
                    .map((item) => (item.id === next.id ? next : item))
                    .filter((item) => item.armed).length,
                });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VenueCard({
  venue,
  onUpdate,
}: {
  venue: VenueSnapshot;
  onUpdate: (venue: VenueSnapshot) => void;
}) {
  const [margin, setMargin] = useState(String(venue.thresholds.marginTriggerPct));
  const [maxTransfer, setMaxTransfer] = useState(String(venue.thresholds.maxTransferUsd));
  const [busy, setBusy] = useState<"save" | "evaluate" | "toggle" | "keys" | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [draftKeys, setDraftKeys] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = useMemo(() => {
    return (
      Number(margin) !== venue.thresholds.marginTriggerPct ||
      Number(maxTransfer) !== venue.thresholds.maxTransferUsd
    );
  }, [margin, maxTransfer, venue.thresholds]);

  function showResult(ok: boolean, text: string) {
    setResult({ ok, text });
    if (ok) toast.success(text);
    else toast.error(text);
  }

  async function saveThresholds(extra?: { enabled?: boolean }) {
    const enabled = extra?.enabled ?? venue.enabled;
    const toggling = extra?.enabled != null && extra.enabled !== venue.enabled;
    setBusy(toggling ? "toggle" : "save");
    if (toggling) {
      const armed = enabled && venue.live.marginRatioPct <= Number(margin);
      onUpdate({
        ...venue,
        enabled,
        armed,
        suggestedTransferUsd: armed ? venue.thresholds.maxTransferUsd : 0,
      });
    }
    try {
      const response = await fetch(`/api/venues/${venue.id}/thresholds`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          enabled,
          marginTriggerPct: Number(margin),
          maxTransferUsd: Number(maxTransfer),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to save TAP");
      onUpdate(body as VenueSnapshot);
      setMargin(String(body.thresholds.marginTriggerPct));
      setMaxTransfer(String(body.thresholds.maxTransferUsd));
      const switched = extra?.enabled != null && extra.enabled !== venue.enabled;
      showResult(
        true,
        switched
          ? `${venue.name} is ${enabled ? "On" : "Off"}`
          : `${venue.name} TAP saved · trigger ${body.thresholds.marginTriggerPct}% · max ${formatUsd(body.thresholds.maxTransferUsd)}`,
      );
    } catch (caught) {
      if (toggling) onUpdate(venue);
      showResult(false, caught instanceof Error ? caught.message : "Unable to save TAP");
    } finally {
      setBusy(null);
    }
  }

  async function saveCredentials() {
    setBusy("keys");
    try {
      const response = await fetch(`/api/venues/${venue.id}/credentials`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draftKeys),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to store credentials");
      onUpdate(body.venue as VenueSnapshot);
      setDraftKeys({});
      showResult(true, `${venue.name} credentials stored in memory only`);
    } catch (caught) {
      showResult(false, caught instanceof Error ? caught.message : "Unable to store credentials");
    } finally {
      setBusy(null);
    }
  }

  async function evaluate() {
    setBusy("evaluate");
    try {
      const amountUsd = Number(maxTransfer);
      const response = await fetch("/api/venues/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ venueId: venue.id, amountUsd }),
      });
      const body = (await response.json()) as TransferTapDecision & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Evaluate failed");
      if (body.allowed) {
        showResult(
          true,
          `${venue.name} dry-run ALLOW · would send ${formatUsd(body.cappedAmountUsd, true)}`,
        );
      } else {
        showResult(
          false,
          `${venue.name} dry-run BLOCK · ${(body.reasons ?? []).join(" · ") || "Blocked"}`,
        );
      }
    } catch (caught) {
      showResult(false, caught instanceof Error ? caught.message : "Evaluate failed");
    } finally {
      setBusy(null);
    }
  }

  const ratio = venue.live.marginRatioPct;
  const trigger = venue.thresholds.marginTriggerPct;
  const bar = Math.min(100, Math.max(0, ratio));
  const locked = busy != null;

  return (
    <Card className={cn(venue.armed && "border-amber-400/40")}>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription>
              {venue.exchange}
              {venue.tags.length ? ` · ${venue.tags.join(" · ")}` : ""}
              {venue.readOnly ? " · watch" : ""}
              {venue.live.source === "live" ? " · live" : ""}
            </CardDescription>
            <CardTitle>{venue.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={venue.enabled ? "default" : "outline"}
              disabled={locked}
              onClick={() => void saveThresholds({ enabled: !venue.enabled })}
            >
              {busy === "toggle" ? "…" : venue.enabled ? "On" : "Off"}
            </Button>
            <Switch
              checked={venue.enabled}
              disabled={locked}
              onCheckedChange={(checked) => void saveThresholds({ enabled: checked })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {venue.id}
          {venue.kind === "perp" ? " · perp" : " · cex"}
          {venue.queriedAs ? ` · ${venue.queriedAs}` : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Account margin
              </p>
              <p className="font-heading text-2xl tabular-nums">{ratio.toFixed(1)}%</p>
            </div>
            <p
              className={cn(
                "text-xs",
                venue.armed ? "text-amber-200" : "text-muted-foreground",
              )}
            >
              {venue.armed ? "Trigger armed" : "Above trigger"}
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", venue.armed ? "bg-amber-300" : "bg-teal-300")}
              style={{ width: `${bar}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Trigger {trigger}% · equity {formatUsd(venue.live.equityUsd, true)} · used{" "}
            {formatUsd(venue.live.usedMarginUsd, true)}
          </p>
        </div>

        <div className="grid gap-3">
          <Field
            label="Account margin trigger"
            suffix="%"
            value={margin}
            onChange={setMargin}
          />
          <Field
            label="Max single transfer"
            prefix="$"
            value={maxTransfer}
            onChange={setMaxTransfer}
          />
        </div>

        <div className="rounded-lg border border-border/80 bg-background/40 p-3 text-xs text-muted-foreground">
          Next transfer if armed:{" "}
          <span className="font-medium text-foreground">
            {formatUsd(venue.suggestedTransferUsd)}
          </span>
          . Fireblocks TAP still has to ALLOW it. Feed: {venue.live.source}
          {venue.live.error ? ` · ${venue.live.error}` : ""}
        </div>

        {result ? (
          <div
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              result.ok
                ? "border-teal-400/40 bg-teal-400/10 text-teal-50"
                : "border-destructive/40 bg-destructive/10 text-destructive",
            )}
          >
            {result.text}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={locked} onClick={() => void saveThresholds()}>
            {busy === "save" ? "Saving…" : dirty ? "Save TAP" : "Save TAP"}
          </Button>
          <Button type="button" variant="outline" disabled={locked} onClick={() => void evaluate()}>
            {busy === "evaluate" ? "Checking…" : "Dry-run transfer"}
          </Button>
        </div>

        <div className="border-t border-border/80 pt-3">
          <p className="text-xs font-medium">HL ↔ Lighter transfer</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Use the <span className="text-foreground">HL ↔ Lighter</span> panel above. That path
            goes through the Fireblocks vault. This card only sets the margin trigger; Dry-run
            transfer does not move USDC.
          </p>
        </div>

        <div className="border-t border-border/80 pt-3">
          <button
            type="button"
            className="text-xs text-teal-300 underline-offset-2 hover:underline"
            onClick={() => setShowKeys((open) => !open)}
          >
            {showKeys ? "Hide API fields" : "Connect account API"}
          </button>
          {showKeys ? (
            <div className="mt-3 space-y-3">
              <p className="text-[11px] text-muted-foreground">
                Stored in this process only. Not written to disk. Leave blank until you have keys.
              </p>
              {venue.credentialFields.map((field) => (
                <label key={field.key} className="block space-y-1">
                  <span className="text-xs text-muted-foreground">
                    {field.label}
                    {field.required ? "" : " (optional)"}
                    {venue.credentialHints.find((hint) => hint.key === field.key)?.set
                      ? " · set"
                      : ""}
                  </span>
                  <Input
                    type={field.type}
                    autoComplete="off"
                    placeholder={field.hint}
                    value={draftKeys[field.key] ?? ""}
                    onValueChange={(value) =>
                      setDraftKeys((current) => ({ ...current, [field.key]: value }))
                    }
                    onChange={(event) =>
                      setDraftKeys((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                  />
                </label>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={locked}
                onClick={() => void saveCredentials()}
              >
                {busy === "keys" ? "Saving…" : "Save credentials"}
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {prefix ? <span className="text-xs text-muted-foreground">{prefix}</span> : null}
        <Input
          inputMode="decimal"
          value={value}
          onValueChange={onChange}
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix ? <span className="text-xs text-muted-foreground">{suffix}</span> : null}
      </div>
    </label>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-heading text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
