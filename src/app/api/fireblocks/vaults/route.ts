import { extractVaults, fireblocksGetFirst } from "@/lib/fireblocks-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await fireblocksGetFirst<unknown>([
      "/v1/vault/accounts_paged?limit=50",
      "/v1/vault/accounts",
    ]);
    const vaults = extractVaults(result.data);
    const paging =
      result.data && typeof result.data === "object"
        ? (result.data as { paging?: unknown }).paging
        : undefined;
    return NextResponse.json({ vaults, paging, path: result.path });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to list vaults" },
      { status: 400 },
    );
  }
}
