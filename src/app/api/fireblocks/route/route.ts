import { isVenueRouteName } from "@/lib/fireblocks-desk";
import { routeNamedVenue, routeVenueFunds } from "@/lib/fireblocks-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    method?: string;
    from?: string;
    to?: string;
    fromVenueId?: string;
    toVenueId?: string;
    amount?: string;
    note?: string;
    waitVaultMs?: number;
  };
  const amount = String(body.amount ?? "");
  const note = body.note;
  const waitVaultMs = body.waitVaultMs;

  try {
    if (body.method) {
      if (!isVenueRouteName(body.method)) {
        return NextResponse.json(
          {
            error: `Unknown method ${body.method}. Use hyperliquidToLighter or lighterToHyperliquid.`,
          },
          { status: 400 },
        );
      }
      const result = await routeNamedVenue(body.method, {
        fromVenueId: body.fromVenueId ?? body.from,
        toVenueId: body.toVenueId ?? body.to,
        amount,
        note,
        waitVaultMs,
      });
      return NextResponse.json(result);
    }

    const fromVenueId = body.fromVenueId ?? body.from ?? "";
    const toVenueId = body.toVenueId ?? body.to ?? "";
    if (!fromVenueId || !toVenueId) {
      return NextResponse.json(
        {
          error:
            'Pass method ("hyperliquidToLighter" | "lighterToHyperliquid") or from and to venue ids',
        },
        { status: 400 },
      );
    }
    const result = await routeVenueFunds({
      fromVenueId,
      toVenueId,
      amount,
      note,
      waitVaultMs,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to route funds" },
      { status: 400 },
    );
  }
}
