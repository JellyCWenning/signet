import { extractTransactions, extractVaults, fireblocksGet, fireblocksPost, buildTransferBody } from "@/lib/fireblocks-store";
import type { CreateTransferInput, FireblocksTx } from "@/lib/fireblocks-types";

export const FIREBLOCKS_TERMINAL = new Set([
  "COMPLETED",
  "BLOCKED",
  "CANCELLED",
  "FAILED",
  "REJECTED",
  "TIMEOUT",
]);

export interface Eip712TypedData {
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  domain: Record<string, unknown>;
  message: Record<string, unknown>;
}

export interface FireblocksEip712Signature {
  r: string;
  s: string;
  v: number;
}

export async function getFireblocksTransaction(txId: string): Promise<{
  transaction: FireblocksTx;
  raw: unknown;
}> {
  const payload = await fireblocksGet<unknown>(`/v1/transactions/${encodeURIComponent(txId)}`);
  const transactions = extractTransactions(payload);
  return { transaction: transactions[0] ?? { id: txId, status: "UNKNOWN" }, raw: payload };
}

export async function waitForFireblocksTx(
  txId: string,
  options: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<{ transaction: FireblocksTx; raw: unknown }> {
  const intervalMs = options.intervalMs ?? 2_000;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const started = Date.now();
  let last: { transaction: FireblocksTx; raw: unknown } | null = null;
  while (Date.now() - started < timeoutMs) {
    last = await getFireblocksTransaction(txId);
    if (FIREBLOCKS_TERMINAL.has(last.transaction.status)) return last;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(
    `Fireblocks tx ${txId} still ${last?.transaction.status ?? "UNKNOWN"} after ${timeoutMs}ms`,
  );
}

export async function createFireblocksTransfer(
  input: CreateTransferInput,
): Promise<{ transaction: FireblocksTx; raw: unknown }> {
  const payload = await fireblocksPost(
    "/v1/transactions",
    buildTransferBody(input),
    input.externalTxId ?? crypto.randomUUID(),
  );
  const transactions = extractTransactions(payload);
  return { transaction: transactions[0] ?? { id: "", status: "UNKNOWN" }, raw: payload };
}

export async function createFireblocksTypedMessage(input: {
  vaultId: string;
  typedData: Eip712TypedData;
  note?: string;
  assetId?: string;
}): Promise<{ transaction: FireblocksTx; raw: unknown }> {
  const payload = await fireblocksPost(
    "/v1/transactions",
    {
      operation: "TYPED_MESSAGE",
      assetId: input.assetId ?? "ETH",
      source: { type: "VAULT_ACCOUNT", id: String(input.vaultId) },
      note: input.note?.trim() || "TAP typed message",
      extraParameters: {
        rawMessageData: {
          messages: [{ content: input.typedData, type: "EIP712" }],
        },
      },
    },
    crypto.randomUUID(),
  );
  const transactions = extractTransactions(payload);
  return { transaction: transactions[0] ?? { id: "", status: "UNKNOWN" }, raw: payload };
}

export function eip712SignatureFromTx(raw: unknown): FireblocksEip712Signature {
  const rec = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const messages = Array.isArray(rec.signedMessages) ? rec.signedMessages : [];
  const first = (messages[0] && typeof messages[0] === "object" ? messages[0] : {}) as Record<
    string,
    unknown
  >;
  const sig =
    first.signature && typeof first.signature === "object"
      ? (first.signature as Record<string, unknown>)
      : null;
  if (!sig || sig.r == null || sig.s == null) {
    throw new Error("Fireblocks typed-message completed without a signature");
  }
  const r = String(sig.r).startsWith("0x") ? String(sig.r) : `0x${sig.r}`;
  const s = String(sig.s).startsWith("0x") ? String(sig.s) : `0x${sig.s}`;
  return { r, s, v: 27 + Number(sig.v) };
}

export async function vaultAssetAvailable(vaultId: string, assetId: string): Promise<number> {
  const payload = await fireblocksGet<unknown>(`/v1/vault/accounts/${encodeURIComponent(vaultId)}`);
  const vault = extractVaults(payload)[0];
  const asset = vault?.assets.find((item) => item.id === assetId);
  const n = Number(asset?.available ?? asset?.total ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function waitForVaultAsset(
  vaultId: string,
  assetId: string,
  minAmount: number,
  options: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<number> {
  const intervalMs = options.intervalMs ?? 15_000;
  const timeoutMs = options.timeoutMs ?? 8 * 60_000;
  const started = Date.now();
  let last = 0;
  while (Date.now() - started < timeoutMs) {
    last = await vaultAssetAvailable(vaultId, assetId);
    if (last + 1e-9 >= minAmount) return last;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(
    `Vault ${vaultId} still has ${last} ${assetId} (need ${minAmount}) after ${timeoutMs}ms`,
  );
}

export function assertAutoSigned(tx: FireblocksTx, expectedSignerLast4?: string): void {
  if (tx.status !== "COMPLETED") {
    throw new Error(
      `Fireblocks ${tx.operation ?? "tx"} ${tx.id} ended ${tx.status}${tx.subStatus ? `/${tx.subStatus}` : ""}`,
    );
  }
  if (tx.rejectedBy) {
    throw new Error(`Fireblocks tx ${tx.id} was rejected by ${tx.rejectedBy}`);
  }
  if (expectedSignerLast4 && tx.signedBy?.length) {
    const match = tx.signedBy.some((id) => id.endsWith(expectedSignerLast4));
    if (!match) {
      throw new Error(
        `Fireblocks tx ${tx.id} signedBy ${tx.signedBy.join(",")} (expected API user …${expectedSignerLast4})`,
      );
    }
  }
}
