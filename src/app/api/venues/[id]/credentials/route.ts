import { getVenueSnapshot, isVenueId, updateVenueCredentials } from "@/lib/venue-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isVenueId(id)) {
    return NextResponse.json({ error: "Unknown venue" }, { status: 404 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const incoming: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string") incoming[key] = value;
  }
  try {
    updateVenueCredentials(id, incoming);
    const venue = await getVenueSnapshot(id);
    return NextResponse.json({
      configured: venue.credentialsConfigured,
      credentialHints: venue.credentialHints,
      venue,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to store credentials";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
