import { listDeskRails } from "@/lib/fireblocks-desk";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    rails: listDeskRails(),
    reuse: {
      call: "POST /api/fireblocks/route",
      body: {
        from: "hyperliquid_fireblocks",
        to: "lighter_fireblocks",
        amount: "1",
      },
      library: "src/lib/fireblocks-rails.ts → routeVenueFunds",
      addAccount:
        "Copy a DESK_RAILS row in src/lib/fireblocks-desk.ts, seed venues.ts, allowlist dests, TAP ALLOW TRANSFER+TYPED_MESSAGE with designated signer.",
    },
    notes: {
      hyperliquidWithdraw: "TYPED_MESSAGE withdraw3 (plus $1 HL fee), then wait for USDC_ARB in the vault",
      lighterDeposit: "TRANSFER USDC_ARB to the Lighter allowlisted contract",
      hyperliquidDeposit: "TRANSFER USDC_ARB to the Hyperliquid allowlisted contract",
      skipWithdraw: "If the vault already holds enough USDC_ARB, routing only TRANSFERs",
      notSendEndpoint:
        "Do not use POST /api/fireblocks/send for venue-to-venue routing — venue TAP remaining-margin will block when accounts are healthy",
    },
  });
}
