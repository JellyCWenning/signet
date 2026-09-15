"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { RequestTable } from "@/components/request-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useJson } from "@/hooks/use-json";
import type { RequestKind, RequestStatus, SignRequest } from "@/lib/types";

const STATUS_TABS: { id: RequestStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Review" },
  { id: "auto_approved", label: "Auto-signed" },
  { id: "approved", label: "Signed" },
  { id: "auto_rejected", label: "Auto-rejected" },
  { id: "rejected", label: "Rejected" },
];

export function QueueView({ initial }: { initial: SignRequest[] }) {
  const [status, setStatus] = useState<RequestStatus | "all">("all");
  const [kind, setKind] = useState<RequestKind | "all">("all");
  const { data, loading, error } = useJson<SignRequest[]>("/api/queue", 2500, initial);

  const filtered = useMemo(() => {
    return (data ?? []).filter((request) => {
      if (status !== "all" && request.status !== status) return false;
      if (kind !== "all" && request.kind !== kind) return false;
      return true;
    });
  }, [data, kind, status]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Queue"
        title="Signing and approval requests"
        description="TAP-allowed signatures from the Co-Signer. Callback is off, so live signing no longer posts here."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={status}
          onValueChange={(value) => setStatus(value as RequestStatus | "all")}
          className="overflow-x-auto"
        >
          <TabsList className="max-w-full overflow-x-auto">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Tabs value={kind} onValueChange={(value) => setKind(value as RequestKind | "all")}>
          <TabsList>
            <TabsTrigger value="all">Any kind</TabsTrigger>
            <TabsTrigger value="tx_sign">Signing</TabsTrigger>
            <TabsTrigger value="config_change">Config</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading queue…</p>
      ) : (
        <RequestTable requests={filtered} />
      )}
    </div>
  );
}
