import { extractWallets, fireblocksGet } from "@/lib/fireblocks-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function safeGet(path: string) {
  try {
    return { ok: true as const, data: await fireblocksGet<unknown>(path) };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unable to load",
    };
  }
}

export async function GET() {
  const [external, internal] = await Promise.all([
    safeGet("/v1/external_wallets"),
    safeGet("/v1/internal_wallets"),
  ]);
  if (!external.ok && !internal.ok) {
    return NextResponse.json(
      { error: external.error || internal.error || "Unable to list wallets" },
      { status: 400 },
    );
  }
  return NextResponse.json({
    external: external.ok ? extractWallets(external.data) : [],
    internal: internal.ok ? extractWallets(internal.data) : [],
    errors: {
      external: external.ok ? null : external.error,
      internal: internal.ok ? null : internal.error,
    },
  });
}
