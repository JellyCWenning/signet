/**
 * Relay quote + status for Lighter (chain 3586256).
 * Deposits are Fireblocks CONTRACT_CALL USDC.approve + depositErc20, not ERC20 TRANSFER.
 */

export const RELAY_QUOTE_URL = "https://api.relay.link/quote/v2";
export const RELAY_STATUS_URL = "https://api.relay.link/intents/status/v3";
export const LIGHTER_API = "https://mainnet.zklighter.elliot.ai";
export const LIGHTER_CHAIN_ID = 3586256;
export const ARBITRUM_CHAIN_ID = 42161;
export const ARB_USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
export const RELAY_DEPOSITORY = "0x4cd00e387622c35bddb9b4c962c136462338bc31";
export const ARBITRUM_RPC = "https://arbitrum-one-rpc.publicnode.com";
export const ARBITRUM_RPCS = [
  "https://arbitrum-one-rpc.publicnode.com",
  "https://arbitrum.llamarpc.com",
  "https://arb1.arbitrum.io/rpc",
];

export function usdcToMicro(amount: string | number): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) throw new Error("amount must be greater than 0");
  return String(Math.round(n * 1_000_000));
}

/** On-chain USDC.allowance(owner, spender) on Arbitrum. */
export async function arbUsdcAllowance(owner: string, spender: string): Promise<bigint> {
  const ownerPad = owner.replace(/^0x/i, "").toLowerCase().padStart(64, "0");
  const spenderPad = spender.replace(/^0x/i, "").toLowerCase().padStart(64, "0");
  const data = `0xdd62ed3e${ownerPad}${spenderPad}`;
  let lastError: Error | null = null;
  for (const rpc of ARBITRUM_RPCS) {
    try {
      const response = await fetch(rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [{ to: ARB_USDC, data }, "latest"],
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const raw = (await response.json()) as { result?: string; error?: { message?: string } };
      if (!raw.result || raw.result === "0x") {
        lastError = new Error(`USDC allowance call failed: ${raw.error?.message ?? JSON.stringify(raw)}`);
        continue;
      }
      return BigInt(raw.result);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError ?? new Error("USDC allowance call failed");
}

export interface RelayQuoteStepItem {
  to?: string;
  data?: string;
  value?: string;
  check?: { endpoint?: string; method?: string };
}

export interface RelayQuote {
  requestId?: string;
  steps: Array<{ id?: string; items?: Array<{ data?: RelayQuoteStepItem; check?: { endpoint?: string } }> }>;
  details?: { currencyOut?: { amountFormatted?: string; amount?: string } };
  fees?: { relayer?: { amountUsd?: string } };
  raw: unknown;
}

export async function quoteRelayLighterDeposit(input: {
  l1Address: string;
  accountIndex: string;
  amountUsdc: string;
}): Promise<RelayQuote> {
  const response = await fetch(RELAY_QUOTE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user: input.l1Address,
      originChainId: ARBITRUM_CHAIN_ID,
      destinationChainId: LIGHTER_CHAIN_ID,
      originCurrency: ARB_USDC,
      destinationCurrency: "0",
      recipient: input.accountIndex,
      tradeType: "EXACT_INPUT",
      amount: usdcToMicro(input.amountUsdc),
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Relay quote failed: ${JSON.stringify(raw)}`);
  }
  const rec = raw as RelayQuote;
  return { ...rec, raw };
}

export function relayStepCalldata(
  quote: RelayQuote,
  stepId: "approve" | "deposit",
): { to: string; data: string; check?: string } {
  const step = quote.steps.find((s) => s.id === stepId);
  const item = step?.items?.[0];
  const data = item?.data;
  if (!data?.to || !data.data) {
    throw new Error(`Relay quote missing ${stepId} calldata`);
  }
  return { to: data.to, data: data.data, check: item?.check?.endpoint ?? data.check?.endpoint };
}

export async function waitRelayIntent(
  requestId: string,
  options: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<{ status: string; raw: unknown }> {
  const intervalMs = options.intervalMs ?? 5_000;
  const timeoutMs = options.timeoutMs ?? 8 * 60_000;
  const started = Date.now();
  let last = "unknown";
  let raw: unknown = null;
  while (Date.now() - started < timeoutMs) {
    const response = await fetch(`${RELAY_STATUS_URL}?requestId=${encodeURIComponent(requestId)}`, {
      signal: AbortSignal.timeout(15_000),
    });
    raw = await response.json().catch(() => ({}));
    last = String((raw as { status?: string }).status ?? "unknown");
    if (last === "success" || last === "refund" || last === "failure") return { status: last, raw };
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Relay intent ${requestId} still ${last} after ${timeoutMs}ms`);
}

export async function lighterCollateral(accountIndex: string): Promise<number> {
  const response = await fetch(
    `${LIGHTER_API}/api/v1/account?by=index&value=${encodeURIComponent(accountIndex)}`,
    { signal: AbortSignal.timeout(15_000) },
  );
  const raw = (await response.json()) as {
    accounts?: Array<{ collateral?: string }>;
  };
  const n = Number(raw.accounts?.[0]?.collateral ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function waitLighterCollateral(
  accountIndex: string,
  minAmount: number,
  options: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<number> {
  const intervalMs = options.intervalMs ?? 10_000;
  const timeoutMs = options.timeoutMs ?? 8 * 60_000;
  const started = Date.now();
  let last = 0;
  while (Date.now() - started < timeoutMs) {
    last = await lighterCollateral(accountIndex);
    if (last + 1e-9 >= minAmount) return last;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(
    `Lighter ${accountIndex} still ${last} USDC (need ${minAmount}) after ${timeoutMs}ms`,
  );
}

export async function quoteRelayLighterWithdraw(input: {
  accountIndex: string;
  l1Address: string;
  amountUsdc: string;
}): Promise<RelayQuote> {
  const response = await fetch(RELAY_QUOTE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user: input.accountIndex,
      originChainId: LIGHTER_CHAIN_ID,
      destinationChainId: ARBITRUM_CHAIN_ID,
      originCurrency: "0",
      destinationCurrency: ARB_USDC,
      recipient: input.l1Address,
      tradeType: "EXACT_INPUT",
      amount: usdcToMicro(input.amountUsdc),
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Relay withdraw quote failed: ${JSON.stringify(raw)}`);
  }
  const rec = raw as RelayQuote;
  return { ...rec, raw };
}

export function relayLighterTransferAction(quote: RelayQuote): {
  toAccountIndex: number;
  assetIndex: number;
  fromRouteType: number;
  toRouteType: number;
  amount: number;
  usdcFee: number;
  memo: string;
} {
  const item = quote.steps[0]?.items?.[0] as
    | { data?: { action?: { parameters?: Record<string, unknown> } } }
    | undefined;
  const p = item?.data?.action?.parameters;
  if (!p) throw new Error("Relay withdraw quote missing Lighter transfer action");
  return {
    toAccountIndex: Number(p.toAccountIndex),
    assetIndex: Number(p.assetIndex),
    fromRouteType: Number(p.fromRouteType ?? 0),
    toRouteType: Number(p.toRouteType ?? 0),
    amount: Number(p.amount),
    usdcFee: Number(p.usdcFee),
    memo: String(p.memo ?? ""),
  };
}
