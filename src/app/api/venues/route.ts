import { listVenueSnapshots } from "@/lib/venue-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const venues = await listVenueSnapshots();
  return NextResponse.json({
    venues,
    armedCount: venues.filter((item) => item.armed).length,
  });
}
