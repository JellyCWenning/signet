import { fireblocksRequest, type FireblocksCredentials } from "@/lib/fireblocks-client";
import type {
  CreateTransferInput,
  FireblocksTx,
  FireblocksVault,
  FireblocksWallet,
} from "@/lib/fireblocks-types";

interface FireblocksState {
  credentials: FireblocksCredentials | null;
}

const globalForFb = globalThis as typeof globalThis & {
  __fireblocksTap?: FireblocksState;
};

function fbState(): FireblocksState {
  if (!globalForFb.__fireblocksTap) {
    globalForFb.__fireblocksTap = {
      credentials: credentialsFromEnv(),
    };
  }
  return globalForFb.__fireblocksTap;
}

function credentialsFromEnv(): FireblocksCredentials | null {
  const apiKey = process.env.FIREBLOCKS_API_KEY?.trim();
  const privateKey = normalizePem(process.env.FIREBLOCKS_SECRET_KEY ?? "");
  const baseUrl =
    process.env.FIREBLOCKS_API_BASE?.trim() || "https://api.fireblocks.io";
  if (!apiKey || !privateKey) return null;
  return { apiKey, privateKey, baseUrl: baseUrl || "https://api.fireblocks.io" };
}

export function normalizePem(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
}

export function getFireblocksCredentials(): FireblocksCredentials | null {
  return fbState().credentials;
}

export function fireblocksConfigured(): boolean {
  return Boolean(fbState().credentials);
}

export function setFireblocksCredentials(input: {
  apiKey: string;
  privateKey: string;
  baseUrl?: string;
}): { configured: true; apiKeyLast4: string; baseUrl: string } {
  const apiKey = input.apiKey.trim();
  const privateKey = normalizePem(input.privateKey);
  if (!apiKey) throw new Error("API key is required");
  if (!privateKey.includes("PRIVATE KEY")) {
    throw new Error("RSA private key PEM is required (BEGIN PRIVATE KEY / BEGIN RSA PRIVATE KEY)");
  }
  const baseUrl = (input.baseUrl?.trim() || "https://api.fireblocks.io")
    .replace(/\/v1\/?$/, "")
    .replace(/\/$/, "");
  fbState().credentials = { apiKey, privateKey, baseUrl };
  return { configured: true, apiKeyLast4: apiKey.slice(-4), baseUrl };
}

export function clearFireblocksCredentials(): void {
  fbState().credentials = null;
}

function creds(): FireblocksCredentials {
  const current = getFireblocksCredentials();
  if (!current) {
    throw new Error("Paste the Fireblocks API key and RSA private key first");
  }
  return current;
}

export function publicFireblocksStatus() {
  const current = getFireblocksCredentials();
  return {
    configured: Boolean(current),
    apiKeyLast4: current ? current.apiKey.slice(-4) : null,
    baseUrl: current?.baseUrl ?? "https://api.fireblocks.io",
    fromEnv: Boolean(process.env.FIREBLOCKS_API_KEY && process.env.FIREBLOCKS_SECRET_KEY),
  };
}

export async function fireblocksGet<T>(path: string): Promise<T> {
  return fireblocksRequest<T>(creds(), { method: "GET", path });
}

export async function fireblocksPost<T>(
  path: string,
  body: unknown,
  idempotencyKey?: string,
): Promise<T> {
  return fireblocksRequest<T>(creds(), { method: "POST", path, body, idempotencyKey });
}

export async function fireblocksPut<T>(
  path: string,
  body: unknown,
  idempotencyKey?: string,
): Promise<T> {
  return fireblocksRequest<T>(creds(), { method: "PUT", path, body, idempotencyKey });
}

export async function fireblocksGetFirst<T>(paths: string[]): Promise<{ path: string; data: T }> {
  let lastError: Error | null = null;
  for (const path of paths) {
    try {
      const data = await fireblocksGet<T>(path);
      return { path, data };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError ?? new Error("All Fireblocks paths failed");
}

export function extractPolicyRules(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const nested = [
    record,
    record.policy,
    record.draft,
    record.draftResponse,
    record.policyAndValidation,
    typeof record.draftResponse === "object" && record.draftResponse
      ? (record.draftResponse as Record<string, unknown>).draft
      : null,
    typeof record.policy === "object" && record.policy
      ? (record.policy as Record<string, unknown>).policy
      : null,
  ];
  for (const item of nested) {
    if (item && typeof item === "object" && Array.isArray((item as { rules?: unknown }).rules)) {
      return (item as { rules: unknown[] }).rules;
    }
  }
  return [];
}

export function extractDraftId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const rec = payload as Record<string, unknown>;
  const candidates = [
    rec.draftId,
    rec.id,
    typeof rec.draft === "object" && rec.draft
      ? (rec.draft as Record<string, unknown>).draftId
      : null,
    typeof rec.draft === "object" && rec.draft ? (rec.draft as Record<string, unknown>).id : null,
    typeof rec.draftResponse === "object" && rec.draftResponse
      ? (rec.draftResponse as Record<string, unknown>).draftId
      : null,
    typeof rec.policy === "object" && rec.policy
      ? (rec.policy as Record<string, unknown>).draftId
      : null,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export function extractVaults(payload: unknown): FireblocksVault[] {
  if (Array.isArray(payload)) return payload.map(asVault);
  if (!payload || typeof payload !== "object") return [];
  const rec = payload as Record<string, unknown>;
  const list = rec.accounts ?? rec.data ?? rec.vaults;
  if (Array.isArray(list)) return list.map(asVault);
  if (typeof rec.id === "string" || typeof rec.name === "string") return [asVault(payload)];
  return [];
}

function asVault(value: unknown): FireblocksVault {
  const rec = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const assets = Array.isArray(rec.assets) ? rec.assets : [];
  return {
    id: String(rec.id ?? ""),
    name: String(rec.name ?? rec.id ?? "Vault"),
    hiddenOnUI: Boolean(rec.hiddenOnUI),
    autoFuel: Boolean(rec.autoFuel),
    assets: assets.map((asset) => {
      const item = (asset && typeof asset === "object" ? asset : {}) as Record<string, unknown>;
      return {
        id: String(item.id ?? item.assetId ?? ""),
        total: item.total != null ? String(item.total) : undefined,
        available: item.available != null ? String(item.available) : undefined,
        pending: item.pending != null ? String(item.pending) : undefined,
        frozen: item.frozen != null ? String(item.frozen) : undefined,
        lockedAmount: item.lockedAmount != null ? String(item.lockedAmount) : undefined,
      };
    }),
  };
}

export function extractWallets(payload: unknown): FireblocksWallet[] {
  if (Array.isArray(payload)) return payload as FireblocksWallet[];
  if (payload && typeof payload !== "object") return [];
  const rec = payload as Record<string, unknown>;
  const list = rec.wallets ?? rec.data;
  return Array.isArray(list) ? (list as FireblocksWallet[]) : [];
}

export function extractTransactions(payload: unknown): FireblocksTx[] {
  if (Array.isArray(payload)) return payload.map(asTx);
  if (!payload || typeof payload !== "object") return [];
  const rec = payload as Record<string, unknown>;
  const list = rec.transactions ?? rec.data;
  if (Array.isArray(list)) return list.map(asTx);
  if (typeof rec.id === "string") return [asTx(payload)];
  return [];
}

function asParty(value: unknown): FireblocksTx["source"] {
  if (!value || typeof value !== "object") return undefined;
  const rec = value as Record<string, unknown>;
  const oneTime =
    rec.oneTimeAddress && typeof rec.oneTimeAddress === "object"
      ? (rec.oneTimeAddress as Record<string, unknown>)
      : null;
  return {
    type: rec.type != null ? String(rec.type) : undefined,
    id: rec.id != null ? String(rec.id) : undefined,
    name: rec.name != null ? String(rec.name) : undefined,
    address:
      oneTime && oneTime.address != null
        ? String(oneTime.address)
        : rec.address != null
          ? String(rec.address)
          : undefined,
  };
}

function asTx(value: unknown): FireblocksTx {
  const rec = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    id: String(rec.id ?? ""),
    status: String(rec.status ?? "UNKNOWN"),
    assetId: rec.assetId != null ? String(rec.assetId) : undefined,
    amount: rec.amount != null ? String(rec.amount) : rec.requestedAmount != null ? String(rec.requestedAmount) : undefined,
    note: rec.note != null ? String(rec.note) : undefined,
    createdAt: typeof rec.createdAt === "number" ? rec.createdAt : undefined,
    lastUpdated: typeof rec.lastUpdated === "number" ? rec.lastUpdated : undefined,
    source: asParty(rec.source),
    destination: asParty(rec.destination),
    txHash: rec.txHash != null ? String(rec.txHash) : undefined,
    externalTxId: rec.externalTxId != null ? String(rec.externalTxId) : undefined,
  };
}

export function buildTransferBody(input: CreateTransferInput) {
  const destType = input.destType || "VAULT_ACCOUNT";
  if (!input.assetId?.trim()) throw new Error("assetId is required");
  if (!input.amount?.trim()) throw new Error("amount is required");
  if (!input.sourceVaultId?.trim()) throw new Error("sourceVaultId is required");
  if (destType === "ONE_TIME_ADDRESS" && !input.destAddress?.trim()) {
    throw new Error("destAddress is required for one-time destinations");
  }
  if (destType !== "ONE_TIME_ADDRESS" && !input.destId?.trim()) {
    throw new Error("destId is required");
  }
  const destination =
    destType === "ONE_TIME_ADDRESS"
      ? { type: "ONE_TIME_ADDRESS", oneTimeAddress: { address: input.destAddress?.trim() } }
      : { type: destType, id: String(input.destId) };
  return {
    operation: "TRANSFER",
    assetId: input.assetId.trim(),
    amount: String(input.amount).trim(),
    source: { type: "VAULT_ACCOUNT", id: String(input.sourceVaultId).trim() },
    destination,
    note: input.note?.trim() || "TAP Console",
    externalTxId: input.externalTxId?.trim() || `tap-${crypto.randomUUID()}`,
  };
}

export function compactUnknown(value: unknown, limit = 80): string {
  if (value == null || value === "") return "—";
  if (typeof value === "string") return value.length > limit ? `${value.slice(0, limit)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    const json = JSON.stringify(value);
    return json.length > limit ? `${json.slice(0, limit)}…` : json;
  } catch {
    return "—";
  }
}

export function summarizeRule(rule: unknown, index: number) {
  const rec = (rule && typeof rule === "object" ? rule : {}) as Record<string, unknown>;
  return {
    index,
    name: String(rec.name ?? rec.type ?? `Rule ${index + 1}`),
    action: String(rec.action ?? rec.operatorAction ?? "—"),
    asset: compactUnknown(rec.asset ?? rec.assetId ?? rec.assetType ?? rec.assetTypes),
    source: compactUnknown(rec.src ?? rec.source ?? rec.sourceType),
    dest: compactUnknown(rec.dst ?? rec.destination ?? rec.dstType),
  };
}
