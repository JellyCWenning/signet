import { ingestCallback } from "@/lib/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function handle(kind: "tx_sign" | "config_change", request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let raw: unknown;
  try {
    if (contentType.includes("application/json")) {
      raw = await request.json();
    } else {
      const text = await request.text();
      raw = text;
    }
    // Fireblocks TAP already authorized this request. Pass-through APPROVE.
    const { response } = ingestCallback(kind, raw);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid callback";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export { handle as handleCallback };
