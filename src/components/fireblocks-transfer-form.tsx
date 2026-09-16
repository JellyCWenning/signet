"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FireblocksTx, FireblocksVault, FireblocksWallet } from "@/lib/fireblocks-types";

const DEST_TYPES = [
  { id: "VAULT_ACCOUNT", label: "Vault account" },
  { id: "EXTERNAL_WALLET", label: "External wallet (allowlist)" },
  { id: "INTERNAL_WALLET", label: "Internal wallet" },
  { id: "ONE_TIME_ADDRESS", label: "One-time address" },
];

export function FireblocksTransferForm({
  venueId,
  defaultAmount,
  defaultNote,
  disabled,
  vaults,
  wallets,
  onSent,
}: {
  venueId?: string;
  defaultAmount?: string;
  defaultNote?: string;
  disabled?: boolean;
  vaults: FireblocksVault[];
  wallets?: { external: FireblocksWallet[]; internal: FireblocksWallet[] };
  onSent?: (tx: FireblocksTx) => void;
}) {
  const [sourceVaultId, setSourceVaultId] = useState(vaults[0]?.id ?? "");
  const [assetId, setAssetId] = useState("USDC");
  const [amount, setAmount] = useState(defaultAmount ?? "");
  const [destType, setDestType] = useState("EXTERNAL_WALLET");
  const [destId, setDestId] = useState("");
  const [destAddress, setDestAddress] = useState("");
  const [note, setNote] = useState(defaultNote ?? "TAP Console");
  const [busy, setBusy] = useState(false);

  const selectedVaultId = sourceVaultId || vaults[0]?.id || "";

  const assets = useMemo(() => {
    const selected = vaults.find((vault) => vault.id === selectedVaultId);
    const ids = new Set<string>();
    for (const asset of selected?.assets ?? []) {
      if (asset.id) ids.add(asset.id);
    }
    if (ids.size === 0) {
      for (const vault of vaults) {
        for (const asset of vault.assets) if (asset.id) ids.add(asset.id);
      }
    }
    if (ids.size === 0) return ["USDC", "USDT", "ETH", "BTC"];
    return Array.from(ids);
  }, [selectedVaultId, vaults]);

  const destOptions =
    destType === "VAULT_ACCOUNT"
      ? vaults.map((vault) => ({ id: vault.id, name: vault.name }))
      : destType === "INTERNAL_WALLET"
        ? (wallets?.internal ?? []).map((wallet) => ({
            id: wallet.id,
            name: wallet.name ?? wallet.id,
          }))
        : destType === "EXTERNAL_WALLET"
          ? (wallets?.external ?? []).map((wallet) => ({
              id: wallet.id,
              name: wallet.name ?? wallet.id,
            }))
          : [];

  async function submit() {
    setBusy(true);
    try {
      const url = venueId ? "/api/fireblocks/send" : "/api/fireblocks/transactions";
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          venueId,
          amountUsd: venueId ? Number(amount) : undefined,
          assetId,
          amount,
          sourceVaultId: selectedVaultId,
          destType,
          destId,
          destAddress,
          note,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to create transaction");
      const tx = body.transaction as FireblocksTx;
      toast.success(`Fireblocks ${tx?.status ?? "submitted"}`, {
        description: tx?.id ? `id ${tx.id}` : undefined,
      });
      onSent?.(tx);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to create transaction");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Source vault</span>
        <select
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={selectedVaultId}
          disabled={disabled}
          onChange={(event) => setSourceVaultId(event.target.value)}
        >
          {vaults.length === 0 ? <option value="">Load vaults first</option> : null}
          {vaults.map((vault) => (
            <option key={vault.id} value={vault.id}>
              {vault.name} ({vault.id})
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Asset ID</span>
          <Input
            list={`fireblocks-assets-${venueId ?? "direct"}`}
            value={assetId}
            disabled={disabled}
            onChange={(event) => setAssetId(event.target.value)}
          />
          <datalist id={`fireblocks-assets-${venueId ?? "direct"}`}>
            {assets.map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">
            {venueId ? "Amount (venue TAP uses this as USD)" : "Amount"}
          </span>
          <Input
            inputMode="decimal"
            value={amount}
            disabled={disabled}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Destination</span>
        <select
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={destType}
          disabled={disabled}
          onChange={(event) => setDestType(event.target.value)}
        >
          {DEST_TYPES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      {destType === "ONE_TIME_ADDRESS" ? (
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Destination address</span>
          <Input
            value={destAddress}
            disabled={disabled}
            placeholder="0x…"
            onChange={(event) => setDestAddress(event.target.value)}
          />
          <p className="text-[11px] text-amber-200">
            Workspace TAP often BLOCKs one-time addresses unless a rule allows them.
          </p>
        </label>
      ) : (
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Destination ID</span>
          {destOptions.length ? (
            <select
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={destId}
              disabled={disabled}
              onChange={(event) => setDestId(event.target.value)}
            >
              <option value="">Select…</option>
              {destOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.id})
                </option>
              ))}
            </select>
          ) : (
            <Input
              value={destId}
              disabled={disabled}
              placeholder="Fireblocks wallet or vault id"
              onChange={(event) => setDestId(event.target.value)}
            />
          )}
        </label>
      )}
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Note</span>
        <Input value={note} disabled={disabled} onChange={(event) => setNote(event.target.value)} />
      </label>
      <Button type="button" disabled={disabled || busy} onClick={() => void submit()}>
        {busy ? "Submitting…" : venueId ? "Send via Fireblocks" : "Create Fireblocks transfer"}
      </Button>
    </div>
  );
}
