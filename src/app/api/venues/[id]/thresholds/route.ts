import { getVenueSnapshot, isVenueId, updateVenueThresholds } from "@/lib/venue-store";
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
  const body = (await request.json().catch(() => ({}))) as {
    enabled?: boolean;
    marginTriggerPct?: number;
    maxTransferUsd?: number;
  };
  try {
    updateVenueThresholds(id, {
      enabled: body.enabled,
      marginTriggerPct:
        body.marginTriggerPct == null ? undefined : Number(body.marginTriggerPct),
      maxTransferUsd: body.maxTransferUsd == null ? undefined : Number(body.maxTransferUsd),
    });
    return NextResponse.json(await getVenueSnapshot(id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update thresholds";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
