export type VenueId = "hyperliquid" | "lighter" | "mexc";

export type VenueKind = "perp" | "cex";

export type VenueFeed = "mock" | "live" | "error";

export interface CredentialField {
  key: string;
  label: string;
  type: "text" | "password";
  required: boolean;
  hint: string;
}

export interface VenueCatalogEntry {
  id: VenueId;
  name: string;
  kind: VenueKind;
  blurb: string;
  credentialFields: CredentialField[];
}

export interface VenueThresholds {
  /** Trigger a top-up when account margin ratio (%) is at or below this value. */
  marginTriggerPct: number;
  /** Cap for one Fireblocks transfer used to refill this account, in USD. */
  maxTransferUsd: number;
}

export interface VenueRecord {
  id: VenueId;
  enabled: boolean;
  thresholds: VenueThresholds;
  credentials: Record<string, string>;
}

export interface CredentialHint {
  key: string;
  label: string;
  set: boolean;
  last4?: string;
}

export interface VenueLiveState {
  equityUsd: number;
  usedMarginUsd: number;
  availableUsd: number;
  marginRatioPct: number;
  source: VenueFeed;
  error?: string;
}

export interface VenueSnapshot {
  id: VenueId;
  name: string;
  kind: VenueKind;
  blurb: string;
  enabled: boolean;
  thresholds: VenueThresholds;
  live: VenueLiveState;
  credentialsConfigured: boolean;
  credentialHints: CredentialHint[];
  credentialFields: CredentialField[];
  armed: boolean;
  suggestedTransferUsd: number;
  lastSyncedAt: string;
}

export interface TransferTapDecision {
  venueId: VenueId;
  allowed: boolean;
  armed: boolean;
  amountUsd: number;
  cappedAmountUsd: number;
  reasons: string[];
}

export const VENUE_CATALOG: VenueCatalogEntry[] = [
  {
    id: "hyperliquid",
    name: "Hyperliquid",
    kind: "perp",
    blurb: "Perp DEX. Live client will read clearinghouse state for the account.",
    credentialFields: [
      {
        key: "walletAddress",
        label: "Account address",
        type: "text",
        required: true,
        hint: "Hyperliquid user address used for info queries",
      },
      {
        key: "agentKey",
        label: "Agent / API wallet key",
        type: "password",
        required: false,
        hint: "Optional. Needed later for live trading, not for reading margin",
      },
    ],
  },
  {
    id: "lighter",
    name: "Lighter",
    kind: "perp",
    blurb: "Perp DEX. Live client will use the Lighter account API.",
    credentialFields: [
      {
        key: "accountId",
        label: "Account id",
        type: "text",
        required: true,
        hint: "Lighter account identifier",
      },
      {
        key: "apiKey",
        label: "API key",
        type: "password",
        required: true,
        hint: "Lighter API key",
      },
      {
        key: "apiSecret",
        label: "API secret",
        type: "password",
        required: true,
        hint: "Lighter API secret",
      },
    ],
  },
  {
    id: "mexc",
    name: "MEXC",
    kind: "cex",
    blurb: "CEX futures. Live client will use the MEXC signed REST account endpoint.",
    credentialFields: [
      {
        key: "apiKey",
        label: "API key",
        type: "password",
        required: true,
        hint: "MEXC API key",
      },
      {
        key: "apiSecret",
        label: "API secret",
        type: "password",
        required: true,
        hint: "MEXC API secret",
      },
    ],
  },
];

export function catalogEntry(id: VenueId): VenueCatalogEntry {
  const found = VENUE_CATALOG.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown venue ${id}`);
  return found;
}

export function isVenueId(value: string): value is VenueId {
  return VENUE_CATALOG.some((item) => item.id === value);
}

export function defaultVenueRecords(): VenueRecord[] {
  return [
    {
      id: "hyperliquid",
      enabled: true,
      thresholds: { marginTriggerPct: 15, maxTransferUsd: 25_000 },
      credentials: {},
    },
    {
      id: "lighter",
      enabled: true,
      thresholds: { marginTriggerPct: 18, maxTransferUsd: 15_000 },
      credentials: {},
    },
    {
      id: "mexc",
      enabled: true,
      thresholds: { marginTriggerPct: 12, maxTransferUsd: 10_000 },
      credentials: {},
    },
  ];
}

export function requiredCredentialsSet(
  id: VenueId,
  credentials: Record<string, string>,
): boolean {
  return catalogEntry(id).credentialFields
    .filter((field) => field.required)
    .every((field) => Boolean(credentials[field.key]?.trim()));
}

export function credentialHints(
  id: VenueId,
  credentials: Record<string, string>,
): CredentialHint[] {
  return catalogEntry(id).credentialFields.map((field) => {
    const value = credentials[field.key]?.trim() ?? "";
    return {
      key: field.key,
      label: field.label,
      set: value.length > 0,
      last4: value.length >= 4 ? value.slice(-4) : value || undefined,
    };
  });
}

export function evaluateTransfer(input: {
  enabled: boolean;
  thresholds: VenueThresholds;
  live: VenueLiveState;
  amountUsd: number;
}): Omit<TransferTapDecision, "venueId"> {
  const reasons: string[] = [];
  const armed = input.live.marginRatioPct <= input.thresholds.marginTriggerPct;
  const capped = Math.min(Math.max(input.amountUsd, 0), input.thresholds.maxTransferUsd);

  if (!input.enabled) {
    reasons.push("Venue is disabled in TAP Console");
  }
  if (!armed) {
    reasons.push(
      `Margin ${input.live.marginRatioPct.toFixed(2)}% is above the ${input.thresholds.marginTriggerPct}% trigger`,
    );
  }
  if (input.amountUsd > input.thresholds.maxTransferUsd) {
    reasons.push(
      `Amount exceeds max single transfer of $${input.thresholds.maxTransferUsd.toLocaleString()}`,
    );
  }
  if (input.amountUsd <= 0) {
    reasons.push("Transfer amount must be greater than 0");
  }

  const allowed = input.enabled && armed && capped > 0 && input.amountUsd > 0;
  return {
    allowed,
    armed,
    amountUsd: input.amountUsd,
    cappedAmountUsd: allowed ? (input.amountUsd > input.thresholds.maxTransferUsd ? capped : input.amountUsd) : 0,
    reasons,
  };
}

export function suggestedTransferUsd(
  enabled: boolean,
  thresholds: VenueThresholds,
  live: VenueLiveState,
): { armed: boolean; suggestedTransferUsd: number } {
  const armed = enabled && live.marginRatioPct <= thresholds.marginTriggerPct;
  return {
    armed,
    suggestedTransferUsd: armed ? thresholds.maxTransferUsd : 0,
  };
}
