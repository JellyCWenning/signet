import { listDeskRails } from "@/lib/fireblocks-desk";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    rails: listDeskRails(),
    reuse: {
      call: "POST /api/fireblocks/vault/ensure then POST /api/fireblocks/route",
      body: {
        from: "hyperliquid_fireblocks",
        to: "lighter_fireblocks",
        amount: "1",
      },
      library: "src/lib/fireblocks-rails.ts → routeVenueFunds",
      addAccount:
        "Copy a DESK_RAILS row in src/lib/fireblocks-desk.ts, seed venues.ts, allowlist dests, TAP ALLOW TRANSFER+TYPED_MESSAGE+CONTRACT_CALL (Lighter is Relay depositErc20).",
    },
    notes: {
      hyperliquidWithdraw: "TYPED_MESSAGE withdraw3 (plus $1 HL fee), then wait for USDC_ARB in the vault",
      lighterDeposit:
        "Relay quote/v2 + CONTRACT_CALL USDC.approve (or leftover allowance) + CONTRACT_CALL depositErc20. ERC20 TRANSFER does not credit.",
      lighterWithdraw:
        "Two hops: Lighter L2 transfer via Relay to the vault, then Fireblocks TRANSFER to Hyperliquid Bridge2. Hop 1 needs a Lighter API key.",
      hyperliquidDeposit:
        "TRANSFER native USDC_ARB to Hyperliquid Bridge2 0x2Df1c51E… (min 5). Catalog dest 0xa95d9c1f is not Bridge2.",
      skipWithdraw: "If the vault already holds enough USDC_ARB, routing only TRANSFERs",
      notSendEndpoint:
        "Do not use POST /api/fireblocks/send for venue-to-venue routing — venue TAP remaining-margin will block when accounts are healthy",
    },
  });
}
