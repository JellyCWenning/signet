import {
  assertErc20TransferCredits,
  hyperliquidWithdrawToCover,
  parsePositiveUsd,
  resolveVenueRoute,
  type AllowlistedDest,
  type DeskRail,
} from "@/lib/fireblocks-desk";
import {
  assertAutoSigned,
  createFireblocksTransfer,
  createFireblocksTypedMessage,
  eip712SignatureFromTx,
  vaultAssetAvailable,
  waitForFireblocksTx,
  waitForVaultAsset,
} from "@/lib/fireblocks-tx";
import { hyperliquidWithdrawTypedData, submitHyperliquidWithdraw } from "@/lib/hyperliquid-withdraw";

export interface RouteStep {
  kind: "typed_message" | "hyperliquid_withdraw" | "wait_vault" | "transfer";
  status: string;
  txId?: string;
  txHash?: string;
  signedBy?: string[];
  detail?: unknown;
}

export interface RouteFundsInput {
  fromVenueId: string;
  toVenueId: string;
  amount: string;
  note?: string;
  waitVaultMs?: number;
}

export interface RouteFundsResult {
  ok: true;
  railId: string;
  amount: string;
  steps: RouteStep[];
}

async function signAndSubmitHyperliquidWithdraw(input: {
  rail: DeskRail;
  amount: string;
  note?: string;
}): Promise<RouteStep[]> {
  const timeMs = Date.now();
  const typedData = hyperliquidWithdrawTypedData({
    destination: input.rail.l1Address,
    amount: input.amount,
    timeMs,
  });
  const created = await createFireblocksTypedMessage({
    vaultId: input.rail.vaultId,
    typedData,
    note: input.note ?? `HL withdraw ${input.amount} USDC to vault ${input.rail.vaultId}`,
  });
  const waited = await waitForFireblocksTx(created.transaction.id);
  assertAutoSigned(waited.transaction);
  const signature = eip712SignatureFromTx(waited.raw);
  const hl = await submitHyperliquidWithdraw({
    destination: input.rail.l1Address,
    amount: input.amount,
    timeMs,
    signature,
  });
  return [
    {
      kind: "typed_message",
      status: waited.transaction.status,
      txId: waited.transaction.id,
      signedBy: waited.transaction.signedBy,
    },
    { kind: "hyperliquid_withdraw", status: "ok", detail: hl },
  ];
}

async function transferToDest(input: {
  rail: DeskRail;
  dest: AllowlistedDest;
  amount: string;
  note?: string;
}): Promise<RouteStep> {
  const created = await createFireblocksTransfer({
    assetId: input.rail.arbUsdcAssetId,
    amount: input.amount,
    sourceVaultId: input.rail.vaultId,
    destType: input.dest.type,
    destId: input.dest.id,
    note: input.note ?? `Vault ${input.rail.vaultId} → ${input.dest.name}`,
  });
  const waited = await waitForFireblocksTx(created.transaction.id, { timeoutMs: 180_000 });
  assertAutoSigned(waited.transaction);
  return {
    kind: "transfer",
    status: waited.transaction.status,
    txId: waited.transaction.id,
    txHash: waited.transaction.txHash,
    signedBy: waited.transaction.signedBy,
  };
}

/**
 * Move USDC between TAP venues that share a Fireblocks vault (same L1).
 *
 * Hyperliquid → Lighter: TYPED_MESSAGE withdraw3 (plus $1 HL fee), then a
 * dest-specific credit (Relay `depositErc20` for Lighter — not ERC20 TRANSFER).
 * Vault → dest skips HL withdraw if the vault already holds enough USDC_ARB.
 */
export async function routeVenueFunds(input: RouteFundsInput): Promise<RouteFundsResult> {
  const amount = parsePositiveUsd(input.amount);
  const { rail, fromKind, dest } = resolveVenueRoute(input.fromVenueId, input.toVenueId);
  assertErc20TransferCredits(dest);
  const steps: RouteStep[] = [];
  const available = await vaultAssetAvailable(rail.vaultId, rail.arbUsdcAssetId);
  const withdrawAmount = hyperliquidWithdrawToCover(available, amount);

  if (withdrawAmount) {
    if (fromKind !== "hyperliquid") {
      throw new Error(
        `Vault ${rail.vaultId} has ${available} ${rail.arbUsdcAssetId}; ${fromKind} withdraw is not implemented. Funds must already be in the vault.`,
      );
    }
    steps.push(
      ...(await signAndSubmitHyperliquidWithdraw({
        rail,
        amount: withdrawAmount,
        note: input.note,
      })),
    );
    const held = await waitForVaultAsset(rail.vaultId, rail.arbUsdcAssetId, amount, {
      timeoutMs: input.waitVaultMs ?? 8 * 60_000,
    });
    steps.push({ kind: "wait_vault", status: "ok", detail: { available: held } });
  }

  steps.push(
    await transferToDest({
      rail,
      dest,
      amount: String(amount),
      note: input.note,
    }),
  );

  return { ok: true, railId: rail.id, amount: String(amount), steps };
}
