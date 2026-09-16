import { railById, railForVenue } from "@/lib/fireblocks-desk";
import {
  assertAutoSigned,
  createFireblocksTypedMessage,
  eip712SignatureFromTx,
  waitForFireblocksTx,
} from "@/lib/fireblocks-tx";
import { hyperliquidWithdrawTypedData, submitHyperliquidWithdraw } from "@/lib/hyperliquid-withdraw";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    amount?: string;
    venueId?: string;
    railId?: string;
    note?: string;
  };
  const amount = body.amount?.trim();
  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "amount must be greater than 0" }, { status: 400 });
  }
  try {
    if (!body.railId?.trim() && !body.venueId?.trim()) {
      return NextResponse.json(
        { error: "railId or venueId is required (see GET /api/fireblocks/desk)" },
        { status: 400 },
      );
    }
    const rail = body.railId ? railById(body.railId) : railForVenue(body.venueId ?? "");
    const timeMs = Date.now();
    const typedData = hyperliquidWithdrawTypedData({
      destination: rail.l1Address,
      amount,
      timeMs,
    });
    const created = await createFireblocksTypedMessage({
      vaultId: rail.vaultId,
      typedData,
      note: body.note ?? `HL withdraw ${amount} USDC`,
    });
    const waited = await waitForFireblocksTx(created.transaction.id);
    assertAutoSigned(waited.transaction);
    const signature = eip712SignatureFromTx(waited.raw);
    const hyperliquid = await submitHyperliquidWithdraw({
      destination: rail.l1Address,
      amount,
      timeMs,
      signature,
    });
    return NextResponse.json({
      ok: true,
      railId: rail.id,
      transaction: waited.transaction,
      hyperliquid,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to withdraw from Hyperliquid" },
      { status: 400 },
    );
  }
}
