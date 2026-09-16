import { buildTransferBody, extractTransactions, fireblocksPost } from "@/lib/fireblocks-store";
import type { CreateTransferInput } from "@/lib/fireblocks-types";
import { evaluateVenueTransfer } from "@/lib/venue-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as CreateTransferInput & {
    venueId?: string;
    amountUsd?: number;
  };
  if (!body.venueId) {
    return NextResponse.json({ error: "venueId is required" }, { status: 400 });
  }
  const amountUsd = Number(body.amountUsd ?? body.amount);
  try {
    const decision = await evaluateVenueTransfer(body.venueId, amountUsd);
    if (!decision.allowed) {
      return NextResponse.json(
        {
          error: decision.reasons.join(" · ") || "Venue TAP blocked this transfer",
          decision,
        },
        { status: 400 },
      );
    }
    const transfer = buildTransferBody({
      ...body,
      note: body.note ?? `TAP Console · ${body.venueId}`,
      externalTxId: body.externalTxId ?? `tap-${body.venueId}-${crypto.randomUUID()}`,
    });
    const payload = await fireblocksPost("/v1/transactions", transfer, crypto.randomUUID());
    const transactions = extractTransactions(payload);
    return NextResponse.json({
      ok: true,
      decision,
      transaction: transactions[0] ?? payload,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send via Fireblocks" },
      { status: 400 },
    );
  }
}
