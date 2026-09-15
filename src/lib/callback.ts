import { resolveAccount } from "@/lib/accounts";
import type { RequestKind, SignRequest } from "@/lib/types";

export interface FireblocksCallbackPayload {
  requestId?: string;
  txId?: string;
  externalTxId?: string;
  operation?: string;
  assetId?: string;
  amount?: number | string;
  amountStr?: string;
  sourceType?: string;
  sourceId?: string;
  destType?: string;
  destId?: string;
  destAddress?: string;
  dstAddressType?: "WHITELISTED" | "ONE_TIME";
  note?: string;
  fee?: string;
  signerId?: string;
  players?: string[];
  type?: string;
  extraInfo?: Record<string, unknown>;
  amountUSD?: number;
  destinations?: Array<{
    dstName?: string;
    dstId?: string;
    dstType?: string;
    dstAddress?: string;
    dstAddressType?: "WHITELISTED" | "ONE_TIME";
    amountUSD?: number;
  }>;
  [key: string]: unknown;
}

export function parseCallbackBody(raw: unknown): FireblocksCallbackPayload {
  if (typeof raw === "string") {
    const parts = raw.split(".");
    if (parts.length === 3) {
      const json = Buffer.from(parts[1], "base64url").toString("utf8");
      return JSON.parse(json) as FireblocksCallbackPayload;
    }
    return JSON.parse(raw) as FireblocksCallbackPayload;
  }
  if (raw && typeof raw === "object") {
    return raw as FireblocksCallbackPayload;
  }
  throw new Error("Callback body must be JSON or a JWT");
}

export function normalizeCallback(
  payload: FireblocksCallbackPayload,
  kind: RequestKind,
  now = Date.now(),
): Omit<SignRequest, "status" | "matchedRuleId" | "matchedRuleName" | "policyVerdict" | "decisionSource"> {
  const dest = payload.destinations?.[0];
  const source = resolveAccount(payload.sourceId, payload.sourceType);
  const destination = resolveAccount(dest?.dstId ?? payload.destId, dest?.dstType ?? payload.destType);
  const amount =
    payload.amountStr ??
    (payload.amount != null ? String(payload.amount) : undefined);
  const amountUsd =
    dest?.amountUSD ??
    (typeof payload.amountUSD === "number" ? payload.amountUSD : undefined);

  return {
    id: payload.requestId ?? crypto.randomUUID(),
    txId: payload.txId,
    externalTxId: payload.externalTxId,
    kind,
    createdAt: new Date(now).toISOString(),
    slaDeadlineAt: new Date(now + 30_000).toISOString(),
    retryCount: 0,
    operation: payload.operation,
    assetId: payload.assetId,
    amount,
    amountUsd,
    sourceName: source?.name,
    sourceId: payload.sourceId,
    sourceType: payload.sourceType ?? source?.type,
    destName: dest?.dstName ?? destination?.name,
    destId: dest?.dstId ?? payload.destId,
    destType: dest?.dstType ?? payload.destType,
    destAddress: dest?.dstAddress ?? payload.destAddress,
    destAddressType: dest?.dstAddressType ?? payload.dstAddressType,
    note: payload.note,
    fee: payload.fee,
    configType: payload.type,
    extraInfo: payload.extraInfo,
    signerId: payload.signerId ?? "api_signer_treasury",
    cosignerId: payload.players?.[0] ?? "cosigner-nitro-prod-1",
    rawPayload: payload,
  };
}
