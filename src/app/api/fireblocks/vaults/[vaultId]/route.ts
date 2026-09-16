import { extractVaults, fireblocksGet } from "@/lib/fireblocks-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ vaultId: string }> }) {
  const { vaultId } = await context.params;
  if (!vaultId) {
    return NextResponse.json({ error: "vaultId is required" }, { status: 400 });
  }
  try {
    const payload = await fireblocksGet<unknown>(
      `/v1/vault/accounts/${encodeURIComponent(vaultId)}`,
    );
    const vaults = extractVaults(payload);
    return NextResponse.json({ vault: vaults[0] ?? payload, raw: payload });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load vault" },
      { status: 400 },
    );
  }
}
