import { ingestCallback } from "@/lib/store";
import { SIMULATE_PRESETS } from "@/lib/seed";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    SIMULATE_PRESETS.map((preset) => ({
      id: preset.id,
      label: preset.label,
      description: preset.description,
      kind: preset.kind,
    })),
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as { presetId?: string };
  const preset = SIMULATE_PRESETS.find((item) => item.id === body.presetId);
  if (!preset) {
    return NextResponse.json({ error: "Unknown preset" }, { status: 400 });
  }
  const payload = {
    ...preset.payload,
    requestId: `req_${crypto.randomUUID().slice(0, 8)}`,
    txId: preset.kind === "config_change" ? undefined : `fb_tx_${crypto.randomUUID().slice(0, 6)}`,
    externalTxId: `sim-${Date.now()}`,
  };
  const result = ingestCallback(preset.kind, payload);
  return NextResponse.json(result);
}
