import { getVenueClient } from "@/lib/venue-clients";
import {
  credentialHints,
  defaultVenueRecords,
  evaluateTransfer,
  exchangeCatalog,
  requiredCredentialsSet,
  suggestedTransferUsd,
  type TransferTapDecision,
  type VenueRecord,
  type VenueSnapshot,
  type VenueThresholds,
} from "@/lib/venues";

interface VenueState {
  records: VenueRecord[];
}

const globalForVenues = globalThis as typeof globalThis & {
  __venueTap?: VenueState;
};

function venueState(): VenueState {
  const current = globalForVenues.__venueTap;
  if (!current || !current.records.some((item) => item.id === "hyperliquid_albert")) {
    globalForVenues.__venueTap = { records: defaultVenueRecords() };
  }
  return globalForVenues.__venueTap!;
}

export function resetVenues(): void {
  globalForVenues.__venueTap = { records: defaultVenueRecords() };
}

export function isVenueId(id: string): boolean {
  return venueState().records.some((item) => item.id === id);
}

function recordFor(id: string): VenueRecord {
  const found = venueState().records.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown venue ${id}`);
  return found;
}

async function snapshotOf(record: VenueRecord): Promise<VenueSnapshot> {
  const catalog = exchangeCatalog(record.exchange);
  const live = await getVenueClient(record.exchange).fetchAccount(record.credentials);
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
    thresholds: { ...record.thresholds },
    live,
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

export async function getVenueSnapshot(id: string): Promise<VenueSnapshot> {
  return snapshotOf(recordFor(id));
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
  if (patch.maxTransferUsd != null) {
    if (!Number.isFinite(patch.maxTransferUsd) || patch.maxTransferUsd <= 0) {
      throw new Error("Max single transfer must be greater than 0");
    }
    record.thresholds.maxTransferUsd = patch.maxTransferUsd;
  }
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
  return { configured: requiredCredentialsSet(record.exchange, record.credentials) };
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
