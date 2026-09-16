"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FireblocksCredentialsCard } from "@/components/fireblocks-credentials-card";
import { FireblocksTransferForm } from "@/components/fireblocks-transfer-form";
import { PageHeader } from "@/components/page-header";
import { TapCallbackMap } from "@/components/tap-callback-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useJson } from "@/hooks/use-json";
import type {
  FireblocksRuleRow,
  FireblocksStatus,
  FireblocksTx,
  FireblocksVault,
  FireblocksWallet,
} from "@/lib/fireblocks-types";
import { relativeTime } from "@/lib/format";

interface PolicyPayload {
  source?: string;
  path?: string;
  draftId?: string | null;
  rules: unknown[];
  rows: FireblocksRuleRow[];
  raw: unknown;
  error?: string;
}

interface VaultPayload {
  vaults: FireblocksVault[];
}

interface WalletPayload {
  external: FireblocksWallet[];
  internal: FireblocksWallet[];
}

interface TxPayload {
  transactions: FireblocksTx[];
}

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(25_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((body as { error?: string }).error ?? response.statusText);
  }
  return body as T;
}

export function PolicyView() {
  const { data: status, setData: setStatus, reload: reloadStatus } = useJson<FireblocksStatus>(
    "/api/fireblocks/credentials",
    8000,
  );
  const configured = Boolean(status?.configured);

  const [policy, setPolicy] = useState<PolicyPayload | null>(null);
  const [draftJson, setDraftJson] = useState("[]");
  const [draftId, setDraftId] = useState("");
  const [vaults, setVaults] = useState<FireblocksVault[]>([]);
  const [wallets, setWallets] = useState<WalletPayload>({ external: [], internal: [] });
  const [transactions, setTransactions] = useState<FireblocksTx[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionNote, setActionNote] = useState<{ ok: boolean; text: string } | null>(null);

  const applyPolicy = useCallback((payload: PolicyPayload) => {
    setPolicy(payload);
    setDraftJson(JSON.stringify(payload.rules ?? [], null, 2));
    if (payload.draftId) setDraftId(payload.draftId);
  }, []);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    void (async () => {
      try {
        const [nextPolicy, vaultPayload, walletPayload, txPayload] = await Promise.all([
          readJson<PolicyPayload>("/api/fireblocks/policy").catch((error: Error) => {
            toast.error(error.message);
            return null;
          }),
          readJson<VaultPayload>("/api/fireblocks/vaults"),
          readJson<WalletPayload>("/api/fireblocks/wallets").catch(() => ({
            external: [],
            internal: [],
          })),
          readJson<TxPayload>("/api/fireblocks/transactions"),
        ]);
        if (cancelled) return;
        if (nextPolicy) applyPolicy(nextPolicy);
        setVaults(vaultPayload.vaults ?? []);
        setWallets(walletPayload);
        setTransactions(txPayload.transactions ?? []);
      } catch (caught) {
        if (!cancelled) {
          toast.error(caught instanceof Error ? caught.message : "Unable to load Fireblocks");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyPolicy, configured]);

  function showNote(ok: boolean, text: string) {
    setActionNote({ ok, text });
    if (ok) toast.success(text);
    else toast.error(text);
  }

  function requireConnected() {
    if (!configured) {
      throw new Error("Paste the Fireblocks API key and RSA private key first");
    }
  }

  async function loadWorkspace() {
    setBusy(true);
    try {
      requireConnected();
      const [nextPolicy, vaultPayload, walletPayload, txPayload] = await Promise.all([
        readJson<PolicyPayload>("/api/fireblocks/policy").catch((error: Error) => {
          showNote(false, error.message);
          return null;
        }),
        readJson<VaultPayload>("/api/fireblocks/vaults"),
        readJson<WalletPayload>("/api/fireblocks/wallets").catch(() => ({
          external: [],
          internal: [],
        })),
        readJson<TxPayload>("/api/fireblocks/transactions"),
      ]);
      if (nextPolicy) applyPolicy(nextPolicy);
      setVaults(vaultPayload.vaults ?? []);
      setWallets(walletPayload);
      setTransactions(txPayload.transactions ?? []);
      showNote(true, "Workspace refreshed");
    } catch (caught) {
      showNote(false, caught instanceof Error ? caught.message : "Unable to load Fireblocks");
    } finally {
      setBusy(false);
    }
  }

  async function loadActive() {
    setBusy(true);
    try {
      requireConnected();
      applyPolicy(await readJson<PolicyPayload>("/api/fireblocks/policy"));
      showNote(true, "Loaded active TAP");
    } catch (caught) {
      showNote(false, caught instanceof Error ? caught.message : "Unable to load TAP");
    } finally {
      setBusy(false);
    }
  }

  async function loadDraft() {
    setBusy(true);
    try {
      requireConnected();
      applyPolicy(await readJson<PolicyPayload>("/api/fireblocks/policy/draft"));
      showNote(true, "Loaded TAP draft");
    } catch (caught) {
      showNote(false, caught instanceof Error ? caught.message : "Unable to load TAP draft");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    setBusy(true);
    try {
      requireConnected();
      const parsed = JSON.parse(draftJson) as unknown;
      const rules = Array.isArray(parsed)
        ? parsed
        : ((parsed as { rules?: unknown[] }).rules ?? null);
      if (!Array.isArray(rules)) throw new Error("JSON must be a rules array or { rules: [] }");
      const payload = await readJson<PolicyPayload>("/api/fireblocks/policy/draft", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      applyPolicy(payload);
      showNote(
        true,
        payload.draftId
          ? `TAP draft saved · ${payload.draftId}`
          : "TAP draft saved · Owner/Admin still must approve publish on mobile",
      );
    } catch (caught) {
      showNote(false, caught instanceof Error ? caught.message : "Unable to save TAP draft");
    } finally {
      setBusy(false);
    }
  }

  async function publishDraft() {
    setBusy(true);
    try {
      requireConnected();
      if (!draftId.trim()) throw new Error("Load or save a draft first so there is a draftId");
      const payload = await readJson<PolicyPayload>("/api/fireblocks/policy/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draftId: draftId.trim() }),
      });
      applyPolicy({ ...payload, rules: payload.rules ?? policy?.rules ?? [] });
      showNote(true, "Publish requested · Owner / Admin must confirm on the Fireblocks mobile app");
    } catch (caught) {
      showNote(false, caught instanceof Error ? caught.message : "Unable to publish TAP");
    } finally {
      setBusy(false);
    }
  }

  async function refreshVaults() {
    setBusy(true);
    try {
      requireConnected();
      const payload = await readJson<VaultPayload>("/api/fireblocks/vaults");
      setVaults(payload.vaults ?? []);
      showNote(true, `${payload.vaults?.length ?? 0} vaults`);
    } catch (caught) {
      showNote(false, caught instanceof Error ? caught.message : "Unable to list vaults");
    } finally {
      setBusy(false);
    }
  }

  async function refreshTxs() {
    setBusy(true);
    try {
      requireConnected();
      const payload = await readJson<TxPayload>("/api/fireblocks/transactions");
      setTransactions(payload.transactions ?? []);
      showNote(true, `${payload.transactions?.length ?? 0} transactions`);
    } catch (caught) {
      showNote(false, caught instanceof Error ? caught.message : "Unable to list transactions");
    } finally {
      setBusy(false);
    }
  }

  async function refreshTx(id: string) {
    try {
      const payload = await readJson<{ transaction: FireblocksTx }>(
        `/api/fireblocks/transactions/${encodeURIComponent(id)}`,
      );
      setTransactions((current) =>
        current.map((item) => (item.id === id ? payload.transaction : item)),
      );
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to refresh transaction");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transaction Authorization Policy"
        title="Fireblocks TAP"
        description="Live Fireblocks API: connect with API key + RSA PEM, load TAP, vaults, and submit transfers. Signer bots cannot read TAP — use Owner / Admin / Non-Signing Admin for policy."
        actions={
          <Button type="button" variant="outline" disabled={busy} onClick={() => void loadWorkspace()}>
            {busy ? "Loading…" : "Refresh workspace"}
          </Button>
        }
      />

      <FireblocksCredentialsCard
        status={status}
        onChange={(next) => {
          setStatus(next);
          void reloadStatus();
          if (next.configured) void loadWorkspace();
        }}
      />

      <Tabs defaultValue="policy">
        <TabsList variant="line" className="w-full max-w-full flex-wrap">
          <TabsTrigger value="policy">TAP rules</TabsTrigger>
          <TabsTrigger value="vaults">Vaults</TabsTrigger>
          <TabsTrigger value="transfer">Transfer</TabsTrigger>
          <TabsTrigger value="txs">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="policy" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Active / draft TAP</CardTitle>
              <CardDescription>
                {policy?.source
                  ? `Loaded from ${policy.path ?? policy.source}`
                  : "Connect, then Load TAP. Saving a draft does not go live until publish + mobile approval."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={busy} onClick={() => void loadActive()}>
                  Load active TAP
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => void loadDraft()}>
                  Load draft
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => void saveDraft()}>
                  Save draft
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => void publishDraft()}>
                  Publish draft
                </Button>
              </div>
              {actionNote ? (
                <div
                  className={
                    actionNote.ok
                      ? "rounded-lg border border-teal-400/40 bg-teal-400/10 px-3 py-2 text-sm text-teal-50"
                      : "rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  }
                >
                  {actionNote.text}
                </div>
              ) : null}
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">Draft ID (from save/load draft)</span>
                <input
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={draftId}
                  onChange={(event) => setDraftId(event.target.value)}
                  placeholder="filled after save or load draft"
                />
              </label>
              {policy?.rows?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Dest</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policy.rows.map((row) => (
                      <TableRow key={row.index}>
                        <TableCell className="tabular-nums">{row.index + 1}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.action}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate font-mono text-xs">
                          {row.asset}
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate font-mono text-xs">
                          {row.source}
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate font-mono text-xs">
                          {row.dest}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {configured
                    ? "No TAP rules loaded yet. Load active TAP. A Signer API user will get a permission error here."
                    : "Connect first."}
                </p>
              )}
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">Rules JSON (sent to PUT /v1/policy/draft)</span>
                <Textarea
                  className="min-h-48 font-mono text-xs"
                  value={draftJson}
                  onChange={(event) => setDraftJson(event.target.value)}
                />
              </label>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vaults" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Vault accounts</CardTitle>
                <CardDescription>GET /v1/vault/accounts_paged — first 50.</CardDescription>
              </div>
              <Button type="button" variant="outline" disabled={busy} onClick={() => void refreshVaults()}>
                Refresh vaults
              </Button>
            </CardHeader>
            <CardContent>
              {vaults.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {configured ? "No vaults returned." : "Connect first."}
                </p>
              ) : (
                <div className="space-y-3">
                  {vaults.map((vault) => (
                    <div key={vault.id} className="rounded-lg border border-border/80 p-3">
                      <p className="text-sm font-medium">
                        {vault.name}{" "}
                        <span className="font-mono text-xs text-muted-foreground">id {vault.id}</span>
                      </p>
                      {vault.assets.length === 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">No balances on this vault.</p>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {vault.assets
                            .filter((asset) => Number(asset.available ?? asset.total ?? 0) !== 0)
                            .map((asset) => `${asset.id} ${asset.available ?? asset.total}`)
                            .join(" · ") || vault.assets.map((asset) => asset.id).join(" · ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfer" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Create transfer</CardTitle>
              <CardDescription>
                POST /v1/transactions. Fireblocks TAP then ALLOW / BLOCK / 2-TIER. Callback stays
                off.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FireblocksTransferForm
                disabled={!configured || busy}
                vaults={vaults}
                wallets={wallets}
                onSent={(tx) => {
                  if (tx?.id) setTransactions((current) => [tx, ...current.filter((item) => item.id !== tx.id)]);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="txs" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Recent transactions</CardTitle>
                <CardDescription>GET /v1/transactions — live workspace, not demo rows.</CardDescription>
              </div>
              <Button type="button" variant="outline" disabled={busy} onClick={() => void refreshTxs()}>
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {configured ? "No transactions returned." : "Connect first."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>When</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <Badge variant="outline">{tx.status}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {tx.amount ?? "—"} {tx.assetId ?? ""}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {tx.source?.name ?? tx.source?.id ?? tx.source?.type ?? "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {tx.destination?.name ??
                            tx.destination?.address ??
                            tx.destination?.id ??
                            tx.destination?.type ??
                            "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tx.createdAt ? relativeTime(new Date(tx.createdAt).toISOString()) : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="xs"
                            variant="ghost"
                            onClick={() => void refreshTx(tx.id)}
                          >
                            Refresh
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TapCallbackMap />
    </div>
  );
}
