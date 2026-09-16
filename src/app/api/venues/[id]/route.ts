import { getVenueSnapshot, isVenueId, removeVenue } from "@/lib/venue-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isVenueId(id)) {
    return NextResponse.json({ error: "Unknown venue" }, { status: 404 });
  }
  const venue = await getVenueSnapshot(id);
  return NextResponse.json(venue);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    removeVenue(id);
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove account";
    const status = message.includes("Unknown") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

