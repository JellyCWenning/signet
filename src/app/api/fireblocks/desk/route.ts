import { listDeskRails, VENUE_ROUTES } from "@/lib/fireblocks-desk";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    rails: listDeskRails(),
    methods: {
      hyperliquidToLighter: {
        ...VENUE_ROUTES.hyperliquidToLighter,
        call: 'routeHyperliquidToLighter({ amount: "2" })',
        hops: "Hyperliquid → vault → Relay depositErc20 → Lighter",
      },
      lighterToHyperliquid: {
        ...VENUE_ROUTES.lighterToHyperliquid,
        call: 'routeLighterToHyperliquid({ amount: "8" })',
        hops: "Lighter → vault → Hyperliquid Bridge2",
      },
    },
    reuse: {
      library: "src/lib/fireblocks-rails.ts",
      docs: "docs/ROUTING.md",
      call: "routeHyperliquidToLighter / routeLighterToHyperliquid, or POST /api/fireblocks/route",
      body: {
        method: "hyperliquidToLighter",
        amount: "2",
      },
      addAccount:
        "Copy a DESK_RAILS row in src/lib/fireblocks-desk.ts, seed venues.ts, allowlist dests, TAP ALLOW TRANSFER+TYPED_MESSAGE+CONTRACT_CALL+ETH_MESSAGE (Lighter is Relay depositErc20; vault→HL is Bridge2).",
    },
    notes: {
      hyperliquidToLighter:
        "TYPED_MESSAGE withdraw3 if vault is short ($1 HL fee), then Relay quote/v2 + CONTRACT_CALL USDC.approve (or leftover allowance) + CONTRACT_CALL depositErc20. ERC20 TRANSFER to 0x4cd00e does not credit.",
      lighterToHyperliquid:
        "Lighter L2 sendTx + Fireblocks ETH_MESSAGE L1Sig to vault, then TRANSFER native USDC_ARB to Hyperliquid Bridge2 0x2Df1c51E (min 5). Catalog dest 0xa95d9c1f is not Bridge2.",
      skipWithdraw: "If the vault already holds enough USDC_ARB, Hyperliquid→Lighter only runs the Relay hop.",
      notSendEndpoint:
        "Do not use POST /api/fireblocks/send for venue-to-venue routing — venue TAP remaining-margin will block when accounts are healthy",
    },
  });
}
