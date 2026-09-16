"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useJson } from "@/hooks/use-json";
import { formatUsd } from "@/lib/format";
import {
  EXCHANGE_CATALOG,
  READ_ONLY_EXCHANGES,
  type ExchangeId,
  type VenueSnapshot,
} from "@/lib/venues";

interface ConsolePayload {
  venues: VenueSnapshot[];
  armedCount: number;
}

const ADDABLE = EXCHANGE_CATALOG.filter((item) => READ_ONLY_EXCHANGES.includes(item.id));

export function AccountsView({ initial }: { initial: ConsolePayload }) {
  const { data, setData, reload } = useJson<ConsolePayload>("/api/venues", 8000, initial);
  const venues = data?.venues ?? [];
  const [exchange, setExchange] = useState<ExchangeId>("hyperliquid");
  const [name, setName] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const catalog = useMemo(
    () => ADDABLE.find((item) => item.id === exchange) ?? ADDABLE[0],
    [exchange],
  );

  const addFields = catalog.credentialFields.filter(
    (field) => field.key !== "api_key_index" && field.key !== "api_pub_key",
  );

  async function addAccount() {
    setBusy(true);
    try {
      const response = await fetch("/api/venues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          exchange,
          displayName: name,
          credentials: fields,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to add account");
      toast.success(`${body.venue.name} added`);
      setName("");
      setFields({});
      await reload();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to add account");
    } finally {
      setBusy(false);
    }
  }

  async function removeAccount(venue: VenueSnapshot) {
    if (!venue.readOnly) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/venues/${venue.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to remove account");
      toast.success(`${venue.name} removed`);
      setData({
        venues: venues.filter((item) => item.id !== venue.id),
        armedCount: venues.filter((item) => item.id !== venue.id && item.armed).length,
      });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to remove account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Accounts"
        title="Read-only exchange accounts"
        description="These are Hyperliquid / Lighter accounts this desk reads over public APIs. They are not Fireblocks vaults, and this form does not take trading secrets or RSA keys."
      />

      <Card>
        <CardHeader>
          <CardTitle>Add account</CardTitle>
          <CardDescription>
            Address or account index only. Balances come from the exchange info API.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Exchange</span>
            <select
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
              value={exchange}
              onChange={(event) => {
                setExchange(event.target.value as ExchangeId);
                setFields({});
              }}
            >
              {ADDABLE.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Name</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Desk watch account"
            />
          </label>
          {addFields.map((field) => (
            <label key={field.key} className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs text-muted-foreground">
                {field.label}
                {field.key === "account_index" || field.key === "l1_address" || !field.required
                  ? " (optional)"
                  : ""}
              </span>
              <Input
                value={fields[field.key] ?? ""}
                placeholder={field.hint}
                onChange={(event) =>
                  setFields((current) => ({ ...current, [field.key]: event.target.value }))
                }
              />
            </label>
          ))}
          <div className="sm:col-span-2">
            <Button type="button" disabled={busy} onClick={() => void addAccount()}>
              {busy ? "Adding…" : "Add read-only account"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-3 lg:grid-cols-2">
        {venues.map((venue) => (
          <Card key={venue.id}>
            <CardHeader>
              <CardDescription>
                {venue.exchange}
                {venue.readOnly ? " · watch" : " · seeded"}
                {venue.live.source === "live" ? " · live" : ""}
              </CardDescription>
              <CardTitle className="text-base">{venue.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-mono text-xs break-all text-muted-foreground">
                {venue.queriedAs ?? venue.id}
              </p>
              <p>
                Equity {formatUsd(venue.live.equityUsd, true)} · remaining{" "}
                {venue.live.marginRatioPct.toFixed(1)}%
              </p>
              {venue.live.error ? (
                <p className="text-xs text-destructive">{venue.live.error}</p>
              ) : null}
              {venue.readOnly ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void removeAccount(venue)}
                >
                  Remove
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Albert seed account</p>
              )}
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
