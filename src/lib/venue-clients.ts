import type { VenueId, VenueLiveState } from "@/lib/venues";
import { requiredCredentialsSet } from "@/lib/venues";

/**
 * Venue adapters. Live HTTP is not wired until credentials are provided.
 * Each client must keep secrets in the argument object — never log them.
 */
export interface VenueClient {
  id: VenueId;
  fetchAccount(credentials: Record<string, string>): Promise<VenueLiveState>;
}

const MOCK: Record<VenueId, VenueLiveState> = {
  hyperliquid: {
    equityUsd: 1_240_000,
    usedMarginUsd: 186_000,
    availableUsd: 1_054_000,
    marginRatioPct: 12.4,
    source: "mock",
  },
  lighter: {
    equityUsd: 420_000,
    usedMarginUsd: 84_000,
    availableUsd: 336_000,
    marginRatioPct: 22.1,
    source: "mock",
  },
  mexc: {
    equityUsd: 310_000,
    usedMarginUsd: 86_800,
    availableUsd: 223_200,
    marginRatioPct: 9.6,
    source: "mock",
  },
};

async function mockState(id: VenueId, note?: string): Promise<VenueLiveState> {
  return {
    ...MOCK[id],
    source: "mock",
    error: note,
  };
}

class HyperliquidClient implements VenueClient {
  id = "hyperliquid" as const;

  async fetchAccount(credentials: Record<string, string>): Promise<VenueLiveState> {
    if (!requiredCredentialsSet(this.id, credentials)) {
      return mockState(this.id, "Waiting on Hyperliquid account address");
    }
    // Live path: POST https://api.hyperliquid.xyz/info
    // body { type: "clearinghouseState", user: credentials.walletAddress }
    return mockState(this.id, "Hyperliquid live client stubbed — using mock balances");
  }
}

class LighterClient implements VenueClient {
  id = "lighter" as const;

  async fetchAccount(credentials: Record<string, string>): Promise<VenueLiveState> {
    if (!requiredCredentialsSet(this.id, credentials)) {
      return mockState(this.id, "Waiting on Lighter API key, secret, and account id");
    }
    // Live path: Lighter REST account endpoint with API key signing.
    return mockState(this.id, "Lighter live client stubbed — using mock balances");
  }
}

class MexcClient implements VenueClient {
  id = "mexc" as const;

  async fetchAccount(credentials: Record<string, string>): Promise<VenueLiveState> {
    if (!requiredCredentialsSet(this.id, credentials)) {
      return mockState(this.id, "Waiting on MEXC API key and secret");
    }
    // Live path: MEXC futures signed GET /api/v1/account
    return mockState(this.id, "MEXC live client stubbed — using mock balances");
  }
}

const CLIENTS: Record<VenueId, VenueClient> = {
  hyperliquid: new HyperliquidClient(),
  lighter: new LighterClient(),
  mexc: new MexcClient(),
};

export function getVenueClient(id: VenueId): VenueClient {
  return CLIENTS[id];
}
