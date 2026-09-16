import { routeVenueFunds } from "@/lib/fireblocks-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    from?: string;
    to?: string;
    fromVenueId?: string;
    toVenueId?: string;
    amount?: string;
    note?: string;
    waitVaultMs?: number;
  };
  const fromVenueId = body.fromVenueId ?? body.from ?? "";
  const toVenueId = body.toVenueId ?? body.to ?? "";
  if (!fromVenueId || !toVenueId) {
    return NextResponse.json(
      { error: "from and to venue ids are required (e.g. hyperliquid_fireblocks → lighter_fireblocks)" },
      { status: 400 },
    );
  }
  try {
    const result = await routeVenueFunds({
      fromVenueId,
      toVenueId,
      amount: String(body.amount ?? ""),
      note: body.note,
      waitVaultMs: body.waitVaultMs,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to route funds" },
      { status: 400 },
    );
  }
}
