export type ExchangeId = "hyperliquid" | "lighter" | "mexc";

export type VenueKind = "perp" | "cex";

export type VenueFeed = "mock" | "live" | "error";

export interface CredentialField {
  key: string;
  label: string;
  type: "text" | "password";
  required: boolean;
  hint: string;
}

export interface ExchangeCatalogEntry {
  id: ExchangeId;
  name: string;
  kind: VenueKind;
  blurb: string;
  credentialFields: CredentialField[];
}

export interface VenueThresholds {
  /** Trigger a top-up when remaining margin (%) is at or below this value. */
  marginTriggerPct: number;
  /** Cap for one Fireblocks transfer used to refill this account, in USD. */
  maxTransferUsd: number;
}

export interface VenueRecord {
  id: string;
  exchange: ExchangeId;
  displayName: string;
  tags: string[];
  useDemo: boolean;
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
  id: string;
  exchange: ExchangeId;
  name: string;
  kind: VenueKind;
  tags: string[];
  useDemo: boolean;
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
  venueId: string;
  allowed: boolean;
  armed: boolean;
  amountUsd: number;
  cappedAmountUsd: number;
  reasons: string[];
}

export const EXCHANGE_CATALOG: ExchangeCatalogEntry[] = [
  {
    id: "hyperliquid",
    name: "Hyperliquid",
    kind: "perp",
    blurb: "Reads clearinghouseState from the Hyperliquid info API.",
    credentialFields: [
      {
        key: "account_address",
        label: "Account address",
        type: "text",
        required: true,
        hint: "Hyperliquid user address",
      },
      {
        key: "base_url",
        label: "Base URL",
        type: "text",
        required: true,
        hint: "https://api.hyperliquid.xyz",
      },
    ],
  },
  {
    id: "lighter",
    name: "Lighter",
    kind: "perp",
    blurb: "Reads account by index from the Lighter REST API.",
    credentialFields: [
      {
        key: "base_url",
        label: "Base URL",
        type: "text",
        required: true,
        hint: "https://mainnet.zklighter.elliot.ai",
      },
      {
        key: "l1_address",
        label: "L1 address",
        type: "text",
        required: false,
        hint: "Used to resolve account_index",
      },
      {
        key: "account_index",
        label: "Account index",
        type: "text",
        required: true,
        hint: "Lighter integer account index",
      },
      {
        key: "api_key_index",
        label: "API key index",
        type: "text",
        required: false,
        hint: "e.g. 4",
      },
      {
        key: "api_pub_key",
        label: "API public key",
        type: "text",
        required: false,
        hint: "Lighter API public key at that index",
      },
    ],
  },
  {
    id: "mexc",
    name: "MEXC",
    kind: "cex",
    blurb: "Waiting on MEXC API key and secret.",
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

export function exchangeCatalog(id: ExchangeId): ExchangeCatalogEntry {
  const found = EXCHANGE_CATALOG.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown exchange ${id}`);
  return found;
}

export function isExchangeId(value: string): value is ExchangeId {
  return EXCHANGE_CATALOG.some((item) => item.id === value);
}

/** Albert Lighter account_index resolved from L1 0x952e… via accountsByL1Address. */
export const LIGHTER_ALBERT_ACCOUNT_INDEX = "732041";

export function defaultVenueRecords(): VenueRecord[] {
  return [
    {
      id: "hyperliquid_albert",
      exchange: "hyperliquid",
      displayName: "Albert Hyperliquid",
      tags: ["ALBERT"],
      useDemo: false,
      enabled: true,
      thresholds: { marginTriggerPct: 15, maxTransferUsd: 25_000 },
      credentials: {
        account_address: "0x952eFBB40F0886BD9474Ff10eE0893fB0C604956",
        base_url: "https://api.hyperliquid.xyz",
      },
    },
    {
      id: "lighter_albert",
      exchange: "lighter",
      displayName: "Albert Lighter",
      tags: ["ALBERT"],
      useDemo: false,
      enabled: true,
      thresholds: { marginTriggerPct: 18, maxTransferUsd: 15_000 },
      credentials: {
        base_url: "https://mainnet.zklighter.elliot.ai",
        l1_address: "0x952eFBB40F0886BD9474Ff10eE0893fB0C604956",
        account_index: LIGHTER_ALBERT_ACCOUNT_INDEX,
        api_key_index: "4",
        api_pub_key:
          "6fe69e255080e201e6c9142272ecb22a27f1d52b9dc69c5e54ba4c41e845ee9a9794c5326eb54f9d",
      },
    },
    {
      id: "mexc",
      exchange: "mexc",
      displayName: "MEXC",
      tags: [],
      useDemo: false,
      enabled: false,
      thresholds: { marginTriggerPct: 12, maxTransferUsd: 10_000 },
      credentials: {},
    },
  ];
}

export function requiredCredentialsSet(
  exchange: ExchangeId,
  credentials: Record<string, string>,
): boolean {
  return exchangeCatalog(exchange)
    .credentialFields.filter((field) => field.required)
    .every((field) => Boolean(credentials[field.key]?.trim()));
}

export function credentialHints(
  exchange: ExchangeId,
  credentials: Record<string, string>,
): CredentialHint[] {
  return exchangeCatalog(exchange).credentialFields.map((field) => {
    const value = credentials[field.key]?.trim() ?? "";
    return {
      key: field.key,
      label: field.label,
      set: value.length > 0,
      last4: value.length >= 4 ? value.slice(-4) : value || undefined,
    };
  });
}

export function remainingMarginPct(equityUsd: number, availableUsd: number): number {
  if (equityUsd <= 0) return 0;
  return (availableUsd / equityUsd) * 100;
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
    reasons.push("Account is disabled in TAP Console");
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
    cappedAmountUsd: allowed
      ? input.amountUsd > input.thresholds.maxTransferUsd
        ? capped
        : input.amountUsd
      : 0,
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
