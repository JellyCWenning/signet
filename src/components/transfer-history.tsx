"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useJson } from "@/hooks/use-json";
import { formatTimestamp } from "@/lib/format";
import type { TransferHistoryRecord } from "@/lib/transfer-history";
import { cn } from "@/lib/utils";

interface TransferHistoryPayload {
  records: TransferHistoryRecord[];
}

const VENUE_NAMES: Record<string, string> = {
  hyperliquid_fireblocks: "Hyperliquid",
  lighter_fireblocks: "Lighter",
};

export function TransferHistory({ enabled, refreshKey = 0 }: { enabled: boolean; refreshKey?: number }) {
  const { data, error, loading, reload } = useJson<TransferHistoryPayload>(
    `/api/fireblocks/transfer-history?limit=20&refresh=${refreshKey}`,
    8000,
  );
  const records = data?.records ?? [];

  return (
    <Card>
      <CardHeader className="border-b sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardDescription>Manual and automatic venue routes · latest 20</CardDescription>
          <CardTitle>Transfer history</CardTitle>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void reload()}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="pt-2">
        {!enabled ? (
          <p className="py-6 text-sm text-muted-foreground">Connect Fireblocks to load transfer history.</p>
        ) : error ? (
          <div className="flex items-center justify-between gap-3 py-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void reload()}>Retry</Button>
          </div>
        ) : loading && !data ? (
          <p className="py-6 text-sm text-muted-foreground">Loading transfer history…</p>
        ) : records.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No venue transfers recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatTimestamp(record.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {venueName(record.fromVenueId)} → {venueName(record.toVenueId)}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatUsdc(record.amount)}</TableCell>
                  <TableCell className="capitalize">{record.origin}</TableCell>
                  <TableCell><HistoryStatus status={record.status} /></TableCell>
                  <TableCell className="max-w-72 whitespace-normal text-xs text-muted-foreground">
                    <HistoryDetail record={record} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function venueName(id: string): string {
  return VENUE_NAMES[id] ?? id;
}

function formatUsdc(amount: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${amount} USDC`;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value)} USDC`;
}

function HistoryStatus({ status }: { status: TransferHistoryRecord["status"] }) {
  return (
    <span className={cn(
      "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
      status === "completed" && "border-teal-400/40 bg-teal-400/10 text-teal-200",
      status === "running" && "border-amber-400/40 bg-amber-400/10 text-amber-200",
      status === "failed" && "border-destructive/40 bg-destructive/10 text-destructive",
    )}>
      {status}
    </span>
  );
}

function HistoryDetail({ record }: { record: TransferHistoryRecord }) {
  if (record.error) {
    const message = record.error.length > 120 ? `${record.error.slice(0, 120)}…` : record.error;
    return <span title={record.error}>{message}</span>;
  }
  const steps = record.steps ?? [];
  const reference = [...steps].reverse().find((step) => step.txHash || step.txId);
  const referenceText = reference?.txHash ?? reference?.txId;
  return (
    <span title={referenceText}>
      {steps.length ? `${steps.length} step${steps.length === 1 ? "" : "s"}` : "Awaiting route"}
      {record.railId ? ` · rail ${record.railId}` : ""}
      {referenceText ? ` · ${referenceText.slice(0, 12)}…` : ""}
    </span>
  );
}
