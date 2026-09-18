import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getVenueClient, resolveLighterAccountIndex } from "@/lib/venue-clients";
import {
  credentialHints,
  defaultVenueRecords,
  evaluateTransfer,
  exchangeCatalog,
  isExchangeId,
  READ_ONLY_EXCHANGES,
  requiredCredentialsSet,
  sourceMarginAllowsTransfer,
  suggestedTransferUsd,
  type ExchangeId,
  type TransferTapDecision,
  type VenueLiveState,
  type VenueRecord,
  type VenueSnapshot,
  type VenueThresholds,
} from "@/lib/venues";

interface VenueState {
  records: VenueRecord[];
  live: Record<string, VenueLiveState>;
}

const EXTRAS_PATH = path.join(process.cwd(), "accounts.local.json");
const THRESHOLDS_PATH = path.join(process.cwd(), "venue-thresholds.local.json");
const SEED_IDS = new Set(defaultVenueRecords().map((item) => item.id));

const globalForVenues = globalThis as typeof globalThis & {
  __venueTap?: VenueState;
};

function extrasDir(): void {
  const dir = path.dirname(EXTRAS_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function loadExtras(): VenueRecord[] {
  try {
    if (!existsSync(EXTRAS_PATH)) return [];
    const parsed = JSON.parse(readFileSync(EXTRAS_PATH, "utf8")) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(asUserRecord)
      .filter((item): item is VenueRecord => item != null && !SEED_IDS.has(item.id));
  } catch {
    return [];
  }
}

function asUserRecord(value: unknown): VenueRecord | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.id !== "string" || !rec.id.trim()) return null;
  if (!isExchangeId(String(rec.exchange))) return null;
  if (!READ_ONLY_EXCHANGES.includes(rec.exchange as ExchangeId)) return null;
  const credentials =
    rec.credentials && typeof rec.credentials === "object"
      ? Object.fromEntries(
          Object.entries(rec.credentials as Record<string, unknown>).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        )
      : {};
  const thresholds = (rec.thresholds && typeof rec.thresholds === "object"
    ? rec.thresholds
    : {}) as Record<string, unknown>;
  return {
    id: rec.id.trim(),
    exchange: rec.exchange as ExchangeId,
    displayName: String(rec.displayName ?? rec.name ?? rec.id).trim() || rec.id,
    tags: Array.isArray(rec.tags) ? rec.tags.map((tag) => String(tag)) : ["WATCH"],
    useDemo: false,
    enabled: rec.enabled !== false,
    readOnly: true,
    thresholds: {
      marginTriggerPct: Number(thresholds.marginTriggerPct) || 15,
      minSourceMarginPct: Number(thresholds.minSourceMarginPct) || 70,
      maxTransferUsd: Number(thresholds.maxTransferUsd) || 10_000,
    },
    credentials,
  };
}

function saveExtras(records: VenueRecord[]): void {
  extrasDir();
  const extras = records.filter((item) => item.readOnly || !SEED_IDS.has(item.id));
  writeFileSync(EXTRAS_PATH, JSON.stringify(extras, null, 2), { encoding: "utf8", mode: 0o600 });
}

function loadThresholdOverrides(): Record<string, { enabled: boolean; thresholds: VenueThresholds }> {
  try {
    if (!existsSync(THRESHOLDS_PATH)) return {};
    const parsed = JSON.parse(readFileSync(THRESHOLDS_PATH, "utf8")) as Record<
      string,
      { enabled?: unknown; thresholds?: Partial<VenueThresholds> }
    >;
    return Object.fromEntries(
      Object.entries(parsed).map(([id, value]) => [
        id,
        {
          enabled: value.enabled !== false,
          thresholds: {
            marginTriggerPct: Number(value.thresholds?.marginTriggerPct) || 15,
            minSourceMarginPct: Number(value.thresholds?.minSourceMarginPct) || 70,
            maxTransferUsd: Number(value.thresholds?.maxTransferUsd) || 10_000,
          },
        },
      ]),
    );
  } catch {
    return {};
  }
}

function saveThresholdOverrides(records: VenueRecord[]): void {
  const overrides = Object.fromEntries(
    records.map((record) => [
      record.id,
      { enabled: record.enabled, thresholds: record.thresholds },
    ]),
  );
  writeFileSync(THRESHOLDS_PATH, JSON.stringify(overrides, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
}

function venueState(): VenueState {
  if (!globalForVenues.__venueTap) {
    const seeds = defaultVenueRecords();
    const extras = loadExtras().filter((item) => !SEED_IDS.has(item.id));
    const records = [...seeds, ...extras];
    const overrides = loadThresholdOverrides();
    for (const record of records) {
      const override = overrides[record.id];
      if (override) {
        record.enabled = override.enabled;
        record.thresholds = override.thresholds;
      }
    }
    globalForVenues.__venueTap = { records, live: {} };
  } else {
    for (const record of globalForVenues.__venueTap.records) {
      if (record.readOnly == null) record.readOnly = !SEED_IDS.has(record.id);
    }
  }
  return globalForVenues.__venueTap;
}

export function resetVenues(): void {
  globalForVenues.__venueTap = { records: defaultVenueRecords(), live: {} };
}

export function isVenueId(id: string): boolean {
  return venueState().records.some((item) => item.id === id);
}

function recordFor(id: string): VenueRecord {
  const found = venueState().records.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown venue ${id}`);
  return found;
}

async function snapshotOf(
  record: VenueRecord,
  options: { refreshLive?: boolean } = {},
): Promise<VenueSnapshot> {
  const catalog = exchangeCatalog(record.exchange);
  const refreshLive = options.refreshLive !== false;
  let live = venueState().live[record.id];
  if (refreshLive || !live) {
    live = await getVenueClient(record.exchange).fetchAccount(record.credentials);
    venueState().live[record.id] = live;
  }
  const { armed, suggestedTransferUsd: suggested } = suggestedTransferUsd(
    record.enabled,
    record.thresholds,
    live,
  );
  return {
    id: record.id,
    exchange: record.exchange,
    name: record.displayName,
    kind: catalog.kind,
    tags: [...record.tags],
    useDemo: record.useDemo,
    blurb: catalog.blurb,
    enabled: record.enabled,
    readOnly: Boolean(record.readOnly),
    thresholds: { ...record.thresholds },
    live,
    queriedAs:
      record.credentials.account_address ||
      record.credentials.l1_address ||
      record.credentials.account_index,
    credentialsConfigured: requiredCredentialsSet(record.exchange, record.credentials),
    credentialHints: credentialHints(record.exchange, record.credentials),
    credentialFields: catalog.credentialFields,
    armed,
    suggestedTransferUsd: suggested,
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function listVenueSnapshots(): Promise<VenueSnapshot[]> {
  return Promise.all(venueState().records.map((record) => snapshotOf(record)));
}

export async function getVenueSnapshot(
  id: string,
  options: { refreshLive?: boolean } = {},
): Promise<VenueSnapshot> {
  return snapshotOf(recordFor(id), options);
}

export function updateVenueThresholds(
  id: string,
  patch: Partial<{ enabled: boolean } & VenueThresholds>,
): VenueRecord {
  const record = recordFor(id);
  if (patch.enabled != null) record.enabled = patch.enabled;
  if (patch.marginTriggerPct != null) {
    if (
      !Number.isFinite(patch.marginTriggerPct) ||
      patch.marginTriggerPct <= 0 ||
      patch.marginTriggerPct > 100
    ) {
      throw new Error("Account margin trigger must be between 0 and 100");
    }
    record.thresholds.marginTriggerPct = patch.marginTriggerPct;
  }
  if (patch.minSourceMarginPct != null) {
    if (
      !Number.isFinite(patch.minSourceMarginPct) ||
      patch.minSourceMarginPct <= 0 ||
      patch.minSourceMarginPct > 100
    ) {
      throw new Error("Minimum source margin must be between 0 and 100");
    }
    record.thresholds.minSourceMarginPct = patch.minSourceMarginPct;
  }
  if (patch.maxTransferUsd != null) {
    if (!Number.isFinite(patch.maxTransferUsd) || patch.maxTransferUsd <= 0) {
      throw new Error("Max single transfer must be greater than 0");
    }
    record.thresholds.maxTransferUsd = patch.maxTransferUsd;
  }
  if (!SEED_IDS.has(record.id)) saveExtras(venueState().records);
  saveThresholdOverrides(venueState().records);
  return structuredClone({ ...record, credentials: {} });
}

export function updateVenueCredentials(
  id: string,
  incoming: Record<string, string>,
): { configured: boolean } {
  const record = recordFor(id);
  const allowed = new Set(
    exchangeCatalog(record.exchange).credentialFields.map((field) => field.key),
  );
  const next = { ...record.credentials };
  for (const [key, raw] of Object.entries(incoming)) {
    if (!allowed.has(key)) continue;
    const value = raw.trim();
    if (value) next[key] = value;
    else delete next[key];
  }
  record.credentials = next;
  if (!SEED_IDS.has(record.id)) saveExtras(venueState().records);
  return { configured: requiredCredentialsSet(record.exchange, record.credentials) };
}

export async function createReadOnlyVenue(input: {
  exchange: string;
  displayName: string;
  credentials?: Record<string, string>;
}): Promise<VenueSnapshot> {
  if (!isExchangeId(input.exchange) || !READ_ONLY_EXCHANGES.includes(input.exchange)) {
    throw new Error("Choose Hyperliquid or Lighter. Those accounts are read-only public identifiers.");
  }
  const displayName = input.displayName.trim();
  if (!displayName) throw new Error("Name is required");
  const catalog = exchangeCatalog(input.exchange);
  const allowed = new Set(catalog.credentialFields.map((field) => field.key));
  const credentials: Record<string, string> = {};
  for (const [key, raw] of Object.entries(input.credentials ?? {})) {
    if (!allowed.has(key)) continue;
    const value = raw.trim();
    if (value) credentials[key] = value;
  }
  if (input.exchange === "hyperliquid") {
    credentials.base_url ||= "https://api.hyperliquid.xyz";
    if (!credentials.account_address) throw new Error("Hyperliquid account address is required");
  }
  if (input.exchange === "lighter") {
    credentials.base_url ||= "https://mainnet.zklighter.elliot.ai";
    const index = await resolveLighterAccountIndex(credentials);
    if (index) credentials.account_index = index;
    if (!credentials.account_index && !credentials.l1_address) {
      throw new Error("Lighter needs an L1 address or account index");
    }
    if (!credentials.account_index) {
      throw new Error("Could not resolve Lighter account_index from L1 address");
    }
  }
  const record: VenueRecord = {
    id: `${input.exchange}_${crypto.randomUUID().slice(0, 8)}`,
    exchange: input.exchange,
    displayName,
    tags: ["WATCH"],
    useDemo: false,
    enabled: true,
    readOnly: true,
    thresholds: { marginTriggerPct: 15, minSourceMarginPct: 70, maxTransferUsd: 10_000 },
    credentials,
  };
  venueState().records.push(record);
  saveExtras(venueState().records);
  return snapshotOf(record);
}

export function removeVenue(id: string): void {
  if (SEED_IDS.has(id)) throw new Error("Seeded TAP accounts cannot be removed");
  const state = venueState();
  const next = state.records.filter((item) => item.id !== id);
  if (next.length === state.records.length) throw new Error("Unknown venue");
  state.records = next;
  delete state.live[id];
  saveExtras(state.records);
}

export async function evaluateVenueTransfer(
  id: string,
  amountUsd: number,
): Promise<TransferTapDecision> {
  if (!isVenueId(id)) throw new Error("Unknown venue");
  if (!Number.isFinite(amountUsd)) throw new Error("amountUsd is required");
  const record = recordFor(id);
  const live = await getVenueClient(record.exchange).fetchAccount(record.credentials);
  return {
    venueId: id,
    ...evaluateTransfer({
      enabled: record.enabled,
      thresholds: record.thresholds,
      live,
      amountUsd,
    }),
  };
}

/** Refresh the source venue and refuse withdrawals below its configured safety floor. */
export async function assertVenueSourceMargin(id: string): Promise<VenueSnapshot> {
  const snapshot = await getVenueSnapshot(id, { refreshLive: true });
  if (snapshot.live.source !== "live") {
    throw new Error(
      `Transfer blocked: ${snapshot.name} margin is unavailable${snapshot.live.error ? ` (${snapshot.live.error})` : ""}`,
    );
  }
  const minimum = snapshot.thresholds.minSourceMarginPct;
  if (!sourceMarginAllowsTransfer(snapshot.live.marginRatioPct, minimum)) {
    throw new Error(
      `Transfer blocked: ${snapshot.name} margin ${snapshot.live.marginRatioPct.toFixed(2)}% is below the ${minimum}% minimum source margin`,
    );
  }
  return snapshot;
}
