"use client";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/page-header";
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
import type { AuditEvent } from "@/lib/types";
import Link from "next/link";

export function AuditView({ initial }: { initial: AuditEvent[] }) {
  const { data, error, loading } = useJson<AuditEvent[]>("/api/audit", 2500, initial);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Audit log"
        description="Pairing, TAP-allowed signatures, and operator actions for this demo workspace."
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading audit log…</p>
      ) : !data?.length ? (
        <EmptyState
          title="No audit events"
          description="Reset the demo workspace or simulate a callback to generate history."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatTimestamp(event.at)}
                </TableCell>
                <TableCell className="font-mono text-xs">{event.action}</TableCell>
                <TableCell className="font-mono text-xs">{event.actor}</TableCell>
                <TableCell className="text-sm">
                  {event.requestId === "policy" ? (
                    event.detail
                  ) : (
                    <>
                      <Link className="text-teal-300 hover:underline" href={`/queue/${event.requestId}`}>
                        {event.requestId}
                      </Link>
                      <span className="text-muted-foreground"> · {event.detail}</span>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
