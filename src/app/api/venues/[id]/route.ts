import { getVenueSnapshot, isVenueId } from "@/lib/venue-store";
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
