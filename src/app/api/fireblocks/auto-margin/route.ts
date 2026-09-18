import { timingSafeEqual } from "node:crypto";
import { getAutoMarginStatus, runAutoMarginCycle } from "@/lib/auto-margin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const expected = process.env.AUTO_MARGIN_TOKEN?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!expected || !supplied) return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

export async function GET() {
  return NextResponse.json(getAutoMarginStatus());
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runAutoMarginCycle();
    return NextResponse.json(result, { status: result.status === "failed" ? 409 : 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Auto-margin worker failed" },
      { status: 503 },
    );
  }
}
