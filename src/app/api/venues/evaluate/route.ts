import { evaluateVenueTransfer } from "@/lib/venue-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    venueId?: string;
    amountUsd?: number;
  };
  if (!body.venueId) {
    return NextResponse.json({ error: "venueId is required" }, { status: 400 });
  }
  try {
    const decision = await evaluateVenueTransfer(body.venueId, Number(body.amountUsd));
    return NextResponse.json(decision);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to evaluate";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
