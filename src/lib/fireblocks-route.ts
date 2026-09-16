import {
  assertHyperliquidDepositDest,
  HYPERLIQUID_DEPOSIT_MIN_USDC,
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
  arbUsdcAllowance,
  lighterCollateral,
  quoteRelayLighterDeposit,
  quoteRelayLighterWithdraw,
  RELAY_DEPOSITORY,
  relayLighterTransferAction,
  relayStepCalldata,
  usdcToMicro,
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

async function submitContractCall(input: {
  rail: DeskRail;
  dest: AllowlistedDest;
  to: string;
  data: string;
  note: string;
}) {
  const destAddr = input.dest.address?.toLowerCase();
  const to = input.to.toLowerCase();
  const attempts: Array<{ destType: string; destId?: string; destAddress?: string }> = [];
  if (destAddr === to) {
    attempts.push({ destType: "INTERNAL_WALLET", destId: input.dest.id });
    if (input.dest.type !== "INTERNAL_WALLET") {
      attempts.push({ destType: input.dest.type, destId: input.dest.id });
    }
  }
  attempts.push({ destType: "ONE_TIME_ADDRESS", destAddress: input.to });
  const createErrors: string[] = [];
  for (const attempt of attempts) {
    let created;
    try {
      created = await createFireblocksContractCall({
        vaultId: input.rail.vaultId,
        assetId: input.rail.gasAssetId ?? "ETH-AETH",
        destType: attempt.destType,
        destId: attempt.destId,
        destAddress: attempt.destAddress ?? input.to,
        contractCallData: input.data,
        amount: "0",
        note: input.note,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      createErrors.push(`${attempt.destType}: ${message}`);
      continue;
    }
    const waited = await waitForFireblocksTx(created.transaction.id, { timeoutMs: 180_000 });
    assertAutoSigned(waited.transaction);
    return waited;
  }
  throw new Error(createErrors.join(" | ") || "CONTRACT_CALL failed");
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
    const need = BigInt(usdcToMicro(input.amount));
    const spender = input.dest.address ?? RELAY_DEPOSITORY;
    let allowance = BigInt(0);
    try {
      allowance = await arbUsdcAllowance(input.rail.l1Address, spender);
    } catch {
      allowance = BigInt(0);
    }
    if (allowance >= need) {
      steps.push({
        kind: "approve",
        status: "skipped_existing_allowance",
        detail: { allowance: allowance.toString(), need: need.toString(), spender },
      });
    } else {
      let waited;
      try {
        waited = await submitContractCall({
          rail: input.rail,
          dest: input.dest,
          to: call.to,
          data: call.data,
          note: input.note ?? `Approve ${input.amount} USDC for Relay Depository`,
        });
      } catch (error) {
        try {
          const created = await createFireblocksApprove({
            vaultId: input.rail.vaultId,
            assetId: input.rail.arbUsdcAssetId,
            destType: input.dest.type,
            destId: input.dest.id,
            amount: input.amount,
            contractCallData: call.data,
            note: input.note ?? `Approve ${input.amount} USDC for Relay Depository`,
          });
          waited = await waitForFireblocksTx(created.transaction.id, { timeoutMs: 180_000 });
          assertAutoSigned(waited.transaction);
        } catch (approveError) {
          const first = error instanceof Error ? error.message : String(error);
          const second = approveError instanceof Error ? approveError.message : String(approveError);
          throw new Error(
            `USDC approve blocked (need ${need}, allowance ${allowance}). CONTRACT_CALL: ${first}. APPROVE: ${second}. ` +
              `TAP must ALLOW CONTRACT_CALL to USDC ${call.to} and/or APPROVE to Relay Depository ${input.dest.id} from vault ${input.rail.vaultId}, designated signer = this API user.`,
          );
        }
      }
      steps.push({
        kind: "approve",
        status: waited.transaction.status,
        txId: waited.transaction.id,
        txHash: waited.transaction.txHash,
        signedBy: waited.transaction.signedBy,
      });
    }
  }

  const deposit = relayStepCalldata(quote, "deposit");
  let createdWaited;
  try {
    createdWaited = await submitContractCall({
      rail: input.rail,
      dest: input.dest,
      to: deposit.to,
      data: deposit.data,
      note: input.note ?? `Relay depositErc20 ${input.amount} USDC → Lighter ${accountIndex}`,
    });
  } catch (error) {
    throw new Error(
      `depositErc20 CONTRACT_CALL blocked: ${error instanceof Error ? error.message : error}. ` +
        `TAP must ALLOW CONTRACT_CALL (ETH-AETH) from vault ${input.rail.vaultId} to ${input.dest.id}.`,
    );
  }
  steps.push({
    kind: "contract_call",
    status: createdWaited.transaction.status,
    txId: createdWaited.transaction.id,
    txHash: createdWaited.transaction.txHash,
    signedBy: createdWaited.transaction.signedBy,
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

/** Lighter L2 → vault. Relay quote is live; sendTx needs a Lighter API key + L1Sig. */
async function withdrawLighterToVault(input: {
  rail: DeskRail;
  dest: AllowlistedDest;
  toKind: string;
  amount: string;
  note?: string;
}): Promise<RouteStep[]> {
  const accountIndex = input.rail.lighterAccountIndex;
  if (!accountIndex) throw new Error(`Rail ${input.rail.id} missing lighterAccountIndex`);
  const quote = await quoteRelayLighterWithdraw({
    accountIndex,
    l1Address: input.rail.l1Address,
    amountUsdc: input.amount,
  });
  const action = relayLighterTransferAction(quote);
  let hop2 =
    `Fireblocks TRANSFER ${input.amount} USDC_ARB from vault ${input.rail.vaultId} to ${input.dest.name} ` +
    `(${input.dest.address ?? input.dest.id}).`;
  if (input.toKind === "hyperliquid") {
    try {
      assertHyperliquidDepositDest(input.dest);
      if (Number(input.amount) < HYPERLIQUID_DEPOSIT_MIN_USDC) {
        hop2 =
          `Vault → Hyperliquid TRANSFER to Bridge2 after L2 credit. HL min deposit is ${HYPERLIQUID_DEPOSIT_MIN_USDC} USDC; ` +
          `${input.amount} is too small even if hop 1 lands (Relay also takes ~1 USDC L2 gas).`;
      } else {
        hop2 = `Fireblocks TRANSFER native USDC_ARB to Bridge2 (credits vault L1 ${input.rail.l1Address}). Min ${HYPERLIQUID_DEPOSIT_MIN_USDC} USDC.`;
      }
    } catch (error) {
      hop2 = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(
    `Lighter → vault → ${input.toKind} is two hops (same shape as HL → vault → Lighter). ` +
      `Hop 1/2 Lighter → vault: L2 transfer Relay request ${quote.requestId} toAccountIndex=${action.toAccountIndex} ` +
      `amount=${action.amount} usdcFee=${action.usdcFee} memo=${action.memo}. ` +
      `Needs a Lighter API key (index ≥ 4) to sendTx; Fireblocks then RAW-signs EIP-191 L1Sig. Co-Signer cannot sign Lighter L2. ` +
      `Hop 2/2 vault → ${input.toKind}: ${hop2}`,
  );
}

/**
 * Move USDC between TAP venues that share a Fireblocks vault (same L1).
 *
 * Hyperliquid → Lighter: TYPED_MESSAGE withdraw3 if vault is short, then Relay
 * quote + CONTRACT_CALL USDC.approve (or leftover allowance) + CONTRACT_CALL depositErc20.
 * Lighter → Hyperliquid: Lighter L2 → vault (Relay), then vault USDC TRANSFER to HL Bridge2.
 */
export async function routeVenueFunds(input: RouteFundsInput): Promise<RouteFundsResult> {
  const amount = parsePositiveUsd(input.amount);
  const { rail, fromKind, dest, toKind } = resolveVenueRoute(input.fromVenueId, input.toVenueId);
  const steps: RouteStep[] = [];

  if (fromKind === "lighter") {
    steps.push(
      ...(await withdrawLighterToVault({
        rail,
        dest,
        toKind,
        amount: String(amount),
        note: input.note,
      })),
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
    if (toKind === "hyperliquid") assertHyperliquidDepositDest(dest);
    steps.push(await transferToDest({ rail, dest, amount: String(amount), note: input.note }));
  }

  return { ok: true, railId: rail.id, amount: String(amount), steps };
}
