import { getSettings, getStats, listCosigners, resetStore } from "@/lib/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    settings: getSettings(),
    stats: getStats(),
    cosigners: listCosigners(),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "reset") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }
  resetStore();
  return NextResponse.json({ ok: true });
}
