import { createReadOnlyVenue, listVenueSnapshots } from "@/lib/venue-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const venues = await listVenueSnapshots();
  return NextResponse.json({
    venues,
    armedCount: venues.filter((item) => item.armed).length,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    exchange?: string;
    displayName?: string;
    name?: string;
    credentials?: Record<string, string>;
  };
  const credentials: Record<string, string> = {};
  if (body.credentials && typeof body.credentials === "object") {
    for (const [key, value] of Object.entries(body.credentials)) {
      if (typeof value === "string") credentials[key] = value;
    }
  }
  try {
    const venue = await createReadOnlyVenue({
      exchange: body.exchange ?? "",
      displayName: body.displayName ?? body.name ?? "",
      credentials,
    });
    return NextResponse.json({ ok: true, venue });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to add account" },
      { status: 400 },
    );
  }
}

