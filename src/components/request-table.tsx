"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatAmount, formatUsd, kindLabel, relativeTime, truncateAddress } from "@/lib/format";
import type { SignRequest } from "@/lib/types";
import { EmptyState } from "@/components/page-header";

export function RequestTable({
  requests,
  emptyTitle = "No signing requests",
  emptyDescription = "When the API Co-Signer posts to the callback handler, requests land here.",
}: {
  requests: SignRequest[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (requests.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Request</TableHead>
          <TableHead>Movement</TableHead>
          <TableHead className="hidden lg:table-cell">Policy</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Age</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.id} className="cursor-pointer">
            <TableCell>
              <Link href={`/queue/${request.id}`} className="block space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {request.id}
                  </span>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
                    {kindLabel(request.kind)}
                  </span>
                </div>
                <p className="text-sm font-medium">
                    {request.kind === "config_change"
                    ? request.configType?.replace(/_/g, " ")
                    : request.operation}
                  {request.assetId ? ` · ${request.assetId}` : ""}
                </p>
              </Link>
            </TableCell>
            <TableCell>
              <Link href={`/queue/${request.id}`} className="block space-y-0.5">
                <p className="font-medium tabular-nums">
                  {request.kind === "config_change"
                    ? (request.extraInfo?.summary as string) ?? "Workspace change"
                    : formatAmount(request.amount, request.assetId)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {request.kind === "config_change"
                    ? request.signerId
                    : `${request.sourceName ?? "Source"} → ${request.destName ?? truncateAddress(request.destAddress)}`}
                </p>
                {request.amountUsd != null ? (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatUsd(request.amountUsd)}
                  </p>
                ) : null}
              </Link>
            </TableCell>
            <TableCell className="hidden max-w-56 lg:table-cell">
              <Link href={`/queue/${request.id}`} className="block">
                <p className="truncate text-sm">{request.matchedRuleName ?? "Default hold"}</p>
                <p className="text-xs text-muted-foreground">
                  {request.signerId}
                </p>
              </Link>
            </TableCell>
            <TableCell>
              <StatusBadge status={request.status} />
            </TableCell>
            <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
              {relativeTime(request.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
