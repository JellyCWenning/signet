import {
  remainingMarginPct,
  type ExchangeId,
  type VenueLiveState,
} from "@/lib/venues";

const FETCH_MS = 8_000;

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_MS) });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

export interface VenueClient {
  exchange: ExchangeId;
  fetchAccount(credentials: Record<string, string>): Promise<VenueLiveState>;
}

class HyperliquidClient implements VenueClient {
  exchange = "hyperliquid" as const;

  async fetchAccount(credentials: Record<string, string>): Promise<VenueLiveState> {
    const user = credentials.account_address?.trim();
    const base = (credentials.base_url || "https://api.hyperliquid.xyz").replace(/\/$/, "");
    if (!user) {
      return empty("Waiting on Hyperliquid account_address");
    }
    try {
      const raw = (await getJson(`${base}/info`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "clearinghouseState", user }),
      })) as {
        marginSummary?: { accountValue?: string; totalMarginUsed?: string };
        withdrawable?: string;
      };
      const equityUsd = num(raw.marginSummary?.accountValue);
      const usedMarginUsd = num(raw.marginSummary?.totalMarginUsed);
      const availableUsd = num(raw.withdrawable);
      return {
        equityUsd,
        usedMarginUsd,
        availableUsd,
        marginRatioPct: remainingMarginPct(equityUsd, availableUsd),
        source: "live",
      };
    } catch (error) {
      return empty(
        error instanceof Error ? `Hyperliquid: ${error.message}` : "Hyperliquid fetch failed",
      );
    }
  }
}

class LighterClient implements VenueClient {
  exchange = "lighter" as const;

  async fetchAccount(credentials: Record<string, string>): Promise<VenueLiveState> {
    const base = (credentials.base_url || "https://mainnet.zklighter.elliot.ai").replace(
      /\/$/,
      "",
    );
    const index = credentials.account_index?.trim();
    if (!index) {
      return empty("Waiting on Lighter account_index");
    }
    try {
      const raw = (await getJson(
        `${base}/api/v1/account?by=index&value=${encodeURIComponent(index)}`,
      )) as {
        accounts?: Array<{
          collateral?: string;
          available_balance?: string;
          positions?: Array<{ allocated_margin?: string }>;
        }>;
      };
      const account = raw.accounts?.[0];
      if (!account) {
        return empty("Lighter account not found");
      }
      const equityUsd = num(account.collateral);
      const usedMarginUsd = (account.positions ?? []).reduce(
        (sum, position) => sum + num(position.allocated_margin),
        0,
      );
      const availableUsd = num(account.available_balance);
      return {
        equityUsd,
        usedMarginUsd,
        availableUsd,
        marginRatioPct: remainingMarginPct(equityUsd, availableUsd),
        source: "live",
      };
    } catch (error) {
      return empty(error instanceof Error ? `Lighter: ${error.message}` : "Lighter fetch failed");
    }
  }
}

class MexcClient implements VenueClient {
  exchange = "mexc" as const;

  async fetchAccount(credentials: Record<string, string>): Promise<VenueLiveState> {
    if (!credentials.apiKey || !credentials.apiSecret) {
      return empty("Waiting on MEXC API key and secret");
    }
    return empty("MEXC live client stubbed — using empty balances");
  }
}

function empty(error: string): VenueLiveState {
  return {
    equityUsd: 0,
    usedMarginUsd: 0,
    availableUsd: 0,
    marginRatioPct: 0,
    source: "error",
    error,
  };
}

const CLIENTS: Record<ExchangeId, VenueClient> = {
  hyperliquid: new HyperliquidClient(),
  lighter: new LighterClient(),
  mexc: new MexcClient(),
};

export function getVenueClient(exchange: ExchangeId): VenueClient {
  return CLIENTS[exchange];
}

export async function resolveLighterAccountIndex(
  credentials: Record<string, string>,
): Promise<string | null> {
  const existing = credentials.account_index?.trim();
  if (existing) return existing;
  const l1 = credentials.l1_address?.trim();
  if (!l1) return null;
  const base = (credentials.base_url || "https://mainnet.zklighter.elliot.ai").replace(/\/$/, "");
  const raw = (await getJson(
    `${base}/api/v1/accountsByL1Address?l1_address=${encodeURIComponent(l1)}`,
  )) as { sub_accounts?: Array<{ index?: number | string }> };
  const index = raw.sub_accounts?.[0]?.index;
  return index == null ? null : String(index);
}
