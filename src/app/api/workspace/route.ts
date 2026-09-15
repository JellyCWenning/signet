import {
  getSettings,
  getStats,
  listApiUsers,
  listCosigners,
  pairApiUser,
  resetStore,
} from "@/lib/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function snapshot() {
  return {
    settings: getSettings(),
    stats: getStats(),
    cosigners: listCosigners(),
    apiUsers: listApiUsers(),
  };
}

export async function GET() {
  return NextResponse.json(snapshot());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    userId?: string;
    cosignerId?: string | null;
    callbackEnabled?: boolean;
  };
  if (body.action === "reset") {
    resetStore();
    return NextResponse.json(snapshot());
  }
  if (body.action === "pair") {
    if (!body.userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    try {
      pairApiUser(body.userId, body.cosignerId ?? null, body.callbackEnabled);
      return NextResponse.json(snapshot());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to pair";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
