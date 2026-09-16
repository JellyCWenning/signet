"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useJson } from "@/hooks/use-json";
import { formatUsd } from "@/lib/format";
import type { FireblocksStatus } from "@/lib/fireblocks-types";
import type { VenueSnapshot } from "@/lib/venues";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConsolePayload {
  venues: VenueSnapshot[];
  armedCount: number;
}

export function OverviewView({ initialVenues }: { initialVenues: ConsolePayload }) {
  const { data, error, loading } = useJson<ConsolePayload>("/api/venues", 4000, initialVenues);
  const { data: fbStatus } = useJson<FireblocksStatus>("/api/fireblocks/credentials", 8000);
  const venues = data?.venues ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Albert"
        title="Venue TAP"
        description="This app only sets when the bot may send a transfer. It does not run a Co-Signer fleet, a second TAP, or a signing queue."
        actions={
          <div className="flex gap-2">
            <Button nativeButton={false} render={<Link href="/console" />}>
              Open Console
            </Button>
            <Button nativeButton={false} variant="outline" render={<Link href="/flow" />}>
              Flow
            </Button>
            <Button nativeButton={false} variant="outline" render={<Link href="/ops" />}>
              Ops
            </Button>
          </div>
        }
      />

      <section className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Fireblocks TAP</CardDescription>
            <CardTitle className="text-base">Policy — who may send what</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {fbStatus?.configured
              ? `API connected (…${fbStatus.apiKeyLast4}). Load and edit TAP on the Fireblocks TAP page.`
              : "Paste the API key and RSA PEM on Fireblocks TAP to load live ALLOW / BLOCK / 2-TIER rules."}{" "}
            <Link href="/policy" className="text-teal-300 underline-offset-2 hover:underline">
              Open Fireblocks TAP
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Fireblocks Co-Signer (MPC)</CardDescription>
            <CardTitle className="text-base">Still required to auto-sign</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            TAP does not replace MPC. The Virginia Nitro Co-Signer is paired to the Signer API
            user; callback is off. This Tokyo desk does not hold shards. Owner must still approve
            the MPC key-share in the Fireblocks mobile app.{" "}
            <Link href="/ops" className="text-teal-300 underline-offset-2 hover:underline">
              Ops split
            </Link>
          </CardContent>
        </Card>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading live accounts…</p>
      ) : (
        <section className="grid gap-3 lg:grid-cols-2">
          {venues.map((venue) => (
            <Card key={venue.id} className={cn(venue.armed && "border-amber-400/40")}>
              <CardHeader>
                <CardDescription>
                  {venue.exchange} · live
                  {venue.queriedAs ? ` · ${venue.queriedAs}` : ""}
                </CardDescription>
                <CardTitle>{venue.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>
                  Remaining margin{" "}
                  <span className="tabular-nums font-medium">
                    {venue.live.marginRatioPct.toFixed(1)}%
                  </span>
                  {venue.armed ? " · trigger armed" : " · above trigger"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Equity {formatUsd(venue.live.equityUsd, true)} · max transfer{" "}
                  {formatUsd(venue.thresholds.maxTransferUsd)} · trigger{" "}
                  {venue.thresholds.marginTriggerPct}%
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
