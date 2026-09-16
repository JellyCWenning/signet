"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useJson } from "@/hooks/use-json";
import { formatUsd } from "@/lib/format";
import type { VenueSnapshot } from "@/lib/venues";
import { cn } from "@/lib/utils";

interface ConsolePayload {
  venues: VenueSnapshot[];
  armedCount: number;
}

export function ConsoleView({ initial }: { initial: ConsolePayload }) {
  const { data, error, loading, setData, reload } = useJson<ConsolePayload>(
    "/api/venues",
    4000,
    initial,
  );
  const venues = data?.venues ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="TAP Console"
        title="Trigger thresholds"
        description="Account margin and max single transfer for Hyperliquid, Lighter, and MEXC. Venue APIs are stubbed until credentials are wired."
        actions={
          <Button type="button" variant="outline" onClick={() => void reload()}>
            Refresh balances
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Venues"
          value={venues.length}
          hint="Hyperliquid · Lighter · MEXC"
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

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading TAP Console…</p>
      ) : venues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No venues configured.</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
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
  const [busy, setBusy] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [draftKeys, setDraftKeys] = useState<Record<string, string>>({});

  const dirty = useMemo(() => {
    return (
      Number(margin) !== venue.thresholds.marginTriggerPct ||
      Number(maxTransfer) !== venue.thresholds.maxTransferUsd
    );
  }, [margin, maxTransfer, venue.thresholds]);

  async function saveThresholds(extra?: { enabled?: boolean }) {
    setBusy(true);
    try {
      const response = await fetch(`/api/venues/${venue.id}/thresholds`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          enabled: extra?.enabled ?? venue.enabled,
          marginTriggerPct: Number(margin),
          maxTransferUsd: Number(maxTransfer),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to save TAP");
      onUpdate(body as VenueSnapshot);
      setMargin(String(body.thresholds.marginTriggerPct));
      setMaxTransfer(String(body.thresholds.maxTransferUsd));
      toast.success(`${venue.name} TAP updated`);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to save TAP");
    } finally {
      setBusy(false);
    }
  }

  async function saveCredentials() {
    setBusy(true);
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
      toast.success(`${venue.name} credentials stored in memory only`);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to store credentials");
    } finally {
      setBusy(false);
    }
  }

  const ratio = venue.live.marginRatioPct;
  const trigger = venue.thresholds.marginTriggerPct;
  const bar = Math.min(100, Math.max(0, ratio));

  return (
    <Card className={cn(venue.armed && "border-amber-400/40")}>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription>{venue.kind === "perp" ? "Perp DEX" : "CEX"}</CardDescription>
            <CardTitle>{venue.name}</CardTitle>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {venue.enabled ? "On" : "Off"}
            <Switch
              checked={venue.enabled}
              disabled={busy}
              onCheckedChange={(checked) => void saveThresholds({ enabled: checked })}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">{venue.blurb}</p>
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
            Trigger {trigger}% · equity {formatUsd(venue.live.equityUsd)} · used{" "}
            {formatUsd(venue.live.usedMarginUsd)}
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

        <Button type="button" disabled={busy || !dirty} onClick={() => void saveThresholds()}>
          {busy ? "Saving…" : "Save TAP"}
        </Button>

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
                    onChange={(event) =>
                      setDraftKeys((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                  />
                </label>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void saveCredentials()}
              >
                Save credentials
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
