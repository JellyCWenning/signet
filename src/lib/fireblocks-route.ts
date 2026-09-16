import {
  hyperliquidWithdrawToCover,
  parsePositiveUsd,
  resolveVenueRoute,
  type AllowlistedDest,
  type DeskRail,
} from "@/lib/fireblocks-desk";
import {
  assertAutoSigned,
  createFireblocksApprove,
  createFireblocksContractCall,
  createFireblocksTransfer,
  createFireblocksTypedMessage,
  eip712SignatureFromTx,
  vaultAssetAvailable,
  waitForFireblocksTx,
  waitForVaultAsset,
} from "@/lib/fireblocks-tx";
import { hyperliquidWithdrawTypedData, submitHyperliquidWithdraw } from "@/lib/hyperliquid-withdraw";
import {
  lighterCollateral,
  quoteRelayLighterDeposit,
  quoteRelayLighterWithdraw,
  relayLighterTransferAction,
  relayStepCalldata,
  waitLighterCollateral,
  waitRelayIntent,
} from "@/lib/relay-lighter";

export interface RouteStep {
  kind:
    | "typed_message"
    | "hyperliquid_withdraw"
    | "wait_vault"
    | "approve"
    | "contract_call"
    | "relay_wait"
    | "lighter_credit"
    | "transfer";
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

export async function signAndSubmitHyperliquidWithdraw(input: {
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

/** Pull USDC from Hyperliquid until the vault holds at least `minAmount` (HL still charges $1). */
export async function ensureVaultUsdc(input: {
  rail: DeskRail;
  minAmount: string;
  note?: string;
  waitVaultMs?: number;
}): Promise<{ ok: true; available: number; steps: RouteStep[] }> {
  const min = parsePositiveUsd(input.minAmount);
  const steps: RouteStep[] = [];
  const available = await vaultAssetAvailable(input.rail.vaultId, input.rail.arbUsdcAssetId);
  if (available + 1e-9 >= min) {
    return { ok: true, available, steps };
  }
  const shortfall = String(min - available);
  steps.push(
    ...(await signAndSubmitHyperliquidWithdraw({
      rail: input.rail,
      amount: shortfall,
      note: input.note ?? `Vault top-up ${shortfall} USDC (target ${min})`,
    })),
  );
  const held = await waitForVaultAsset(input.rail.vaultId, input.rail.arbUsdcAssetId, min, {
    timeoutMs: input.waitVaultMs ?? 8 * 60_000,
  });
  steps.push({ kind: "wait_vault", status: "ok", detail: { available: held } });
  return { ok: true, available: held, steps };
}

async function transferToDest(input: {
  rail: DeskRail;
  dest: AllowlistedDest;
  amount: string;
  note?: string;
}): Promise<RouteStep> {
  if (input.dest.credit === "relay_deposit_erc20") {
    throw new Error(`${input.dest.name} cannot use ERC20 TRANSFER; use Relay depositErc20`);
  }
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

async function depositLighterViaRelay(input: {
  rail: DeskRail;
  dest: AllowlistedDest;
  amount: string;
  note?: string;
}): Promise<RouteStep[]> {
  const accountIndex = input.rail.lighterAccountIndex;
  if (!accountIndex) {
    throw new Error(`Rail ${input.rail.id} missing lighterAccountIndex`);
  }
  const before = await lighterCollateral(accountIndex);
  const quote = await quoteRelayLighterDeposit({
    l1Address: input.rail.l1Address,
    accountIndex,
    amountUsdc: input.amount,
  });
  const requestId = quote.requestId;
  if (!requestId) throw new Error("Relay quote missing requestId");
  const steps: RouteStep[] = [];

  const approve = quote.steps.find((s) => s.id === "approve");
  if (approve) {
    const call = relayStepCalldata(quote, "approve");
    const created = await createFireblocksApprove({
      vaultId: input.rail.vaultId,
      assetId: input.rail.arbUsdcAssetId,
      destType: input.dest.type,
      destId: input.dest.id,
      amount: input.amount,
      contractCallData: call.data,
      note: input.note ?? `Approve ${input.amount} USDC for Relay Depository`,
    });
    const waited = await waitForFireblocksTx(created.transaction.id, { timeoutMs: 180_000 });
    assertAutoSigned(waited.transaction);
    steps.push({
      kind: "approve",
      status: waited.transaction.status,
      txId: waited.transaction.id,
      txHash: waited.transaction.txHash,
      signedBy: waited.transaction.signedBy,
    });
  }

  const deposit = relayStepCalldata(quote, "deposit");
  let created;
  try {
    created = await createFireblocksContractCall({
      vaultId: input.rail.vaultId,
      assetId: input.rail.gasAssetId ?? "ETH-AETH",
      destType: input.dest.type,
      destId: input.dest.id,
      contractCallData: deposit.data,
      amount: "0",
      note: input.note ?? `Relay depositErc20 ${input.amount} USDC → Lighter ${accountIndex}`,
    });
  } catch {
    created = await createFireblocksContractCall({
      vaultId: input.rail.vaultId,
      assetId: input.rail.gasAssetId ?? "ETH-AETH",
      destType: "INTERNAL_WALLET",
      destId: input.dest.id,
      contractCallData: deposit.data,
      amount: "0",
      note: input.note ?? `Relay depositErc20 ${input.amount} USDC → Lighter ${accountIndex}`,
    });
  }
  const waited = await waitForFireblocksTx(created.transaction.id, { timeoutMs: 180_000 });
  assertAutoSigned(waited.transaction);
  steps.push({
    kind: "contract_call",
    status: waited.transaction.status,
    txId: waited.transaction.id,
    txHash: waited.transaction.txHash,
    signedBy: waited.transaction.signedBy,
    detail: { requestId, to: deposit.to },
  });

  const relay = await waitRelayIntent(requestId);
  if (relay.status !== "success") {
    throw new Error(`Relay intent ${requestId} ended ${relay.status}`);
  }
  steps.push({ kind: "relay_wait", status: relay.status, detail: { requestId } });

  const expected = before + Number(quote.details?.currencyOut?.amountFormatted ?? input.amount) * 0.9;
  const held = await waitLighterCollateral(accountIndex, Math.min(before + 0.5, expected));
  steps.push({
    kind: "lighter_credit",
    status: "ok",
    detail: { before, after: held, quotedOut: quote.details?.currencyOut?.amountFormatted },
  });
  return steps;
}

/**
 * Move USDC between TAP venues that share a Fireblocks vault (same L1).
 *
 * Hyperliquid → Lighter: TYPED_MESSAGE withdraw3 if vault is short, then Relay
 * quote + APPROVE + CONTRACT_CALL depositErc20.
 * Lighter → vault/HL: Relay L2 transfer (needs Lighter API signer) — quoted here.
 */
export async function routeVenueFunds(input: RouteFundsInput): Promise<RouteFundsResult> {
  const amount = parsePositiveUsd(input.amount);
  const { rail, fromKind, dest, toKind } = resolveVenueRoute(input.fromVenueId, input.toVenueId);
  const steps: RouteStep[] = [];

  if (fromKind === "lighter") {
    const accountIndex = rail.lighterAccountIndex;
    if (!accountIndex) throw new Error(`Rail ${rail.id} missing lighterAccountIndex`);
    const quote = await quoteRelayLighterWithdraw({
      accountIndex,
      l1Address: rail.l1Address,
      amountUsdc: String(amount),
    });
    const action = relayLighterTransferAction(quote);
    throw new Error(
      `Lighter → ${toKind} needs a Lighter L2 transfer (Relay request ${quote.requestId}): ` +
        `toAccountIndex=${action.toAccountIndex} amount=${action.amount} usdcFee=${action.usdcFee} memo=${action.memo}. ` +
        `Fireblocks cannot sign that L2 tx; register a Lighter API key (L1 EIP-191) then sendTx.`,
    );
  }

  const available = await vaultAssetAvailable(rail.vaultId, rail.arbUsdcAssetId);
  const withdrawAmount = hyperliquidWithdrawToCover(available, amount);
  if (withdrawAmount) {
    if (fromKind !== "hyperliquid") {
      throw new Error(
        `Vault ${rail.vaultId} has ${available} ${rail.arbUsdcAssetId}; ${fromKind} withdraw is not implemented.`,
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

  if (dest.credit === "relay_deposit_erc20") {
    steps.push(
      ...(await depositLighterViaRelay({
        rail,
        dest,
        amount: String(amount),
        note: input.note,
      })),
    );
  } else {
    steps.push(await transferToDest({ rail, dest, amount: String(amount), note: input.note }));
  }

  return { ok: true, railId: rail.id, amount: String(amount), steps };
}
