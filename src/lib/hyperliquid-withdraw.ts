import type { Eip712TypedData } from "@/lib/fireblocks-tx";

export const HYPERLIQUID_EXCHANGE_URL = "https://api.hyperliquid.xyz/exchange";
export const HYPERLIQUID_SIGNATURE_CHAIN_ID = "0xa4b1";

export function hyperliquidWithdrawTypedData(input: {
  destination: string;
  amount: string;
  timeMs: number;
}): Eip712TypedData {
  return {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      "HyperliquidTransaction:Withdraw": [
        { name: "hyperliquidChain", type: "string" },
        { name: "destination", type: "string" },
        { name: "amount", type: "string" },
        { name: "time", type: "uint64" },
      ],
    },
    primaryType: "HyperliquidTransaction:Withdraw",
    domain: {
      name: "HyperliquidSignTransaction",
      version: "1",
      chainId: 42161,
      verifyingContract: "0x0000000000000000000000000000000000000000",
    },
    message: {
      hyperliquidChain: "Mainnet",
      destination: input.destination,
      amount: input.amount,
      time: input.timeMs,
    },
  };
}

export async function submitHyperliquidWithdraw(input: {
  destination: string;
  amount: string;
  timeMs: number;
  signature: { r: string; s: string; v: number };
}): Promise<unknown> {
  const body = {
    action: {
      type: "withdraw3",
      hyperliquidChain: "Mainnet",
      signatureChainId: HYPERLIQUID_SIGNATURE_CHAIN_ID,
      destination: input.destination,
      amount: input.amount,
      time: input.timeMs,
    },
    nonce: input.timeMs,
    signature: input.signature,
  };
  const response = await fetch(HYPERLIQUID_EXCHANGE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`Hyperliquid withdraw HTTP ${response.status} ${text}`);
  }
  const rec = parsed && typeof parsed === "object" ? (parsed as { status?: string }) : {};
  if (rec.status && rec.status !== "ok") {
    throw new Error(`Hyperliquid withdraw rejected: ${text}`);
  }
  return parsed;
}
