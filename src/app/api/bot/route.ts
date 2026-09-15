import { getBot, handleBotCommand, setBotConnected } from "@/lib/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getBot());
}

export async function POST(request: Request) {
  const body = (await request.json()) as { text?: string; connected?: boolean };
  if (typeof body.connected === "boolean") {
    setBotConnected(body.connected);
    return NextResponse.json(getBot());
  }
  if (!body.text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  const result = handleBotCommand(body.text);
  return NextResponse.json({ ...getBot(), ...result });
}
