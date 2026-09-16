import { railById, railForVenue } from "@/lib/fireblocks-desk";
import { ensureVaultUsdc } from "@/lib/fireblocks-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    amount?: string;
    minAmount?: string;
    railId?: string;
    venueId?: string;
    note?: string;
    waitVaultMs?: number;
  };
  const minAmount = body.minAmount ?? body.amount;
  if (!minAmount || Number(minAmount) <= 0) {
    return NextResponse.json({ error: "minAmount must be greater than 0" }, { status: 400 });
  }
  try {
    const rail = body.railId
      ? railById(body.railId)
      : body.venueId
        ? railForVenue(body.venueId)
        : railById("eason_albert");
    const result = await ensureVaultUsdc({
      rail,
      minAmount: String(minAmount),
      note: body.note,
      waitVaultMs: body.waitVaultMs,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to top up vault" },
      { status: 400 },
    );
  }
}
