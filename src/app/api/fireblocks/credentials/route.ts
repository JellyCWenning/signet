import {
  clearFireblocksCredentials,
  extractVaults,
  fireblocksConfigured,
  fireblocksGetFirst,
  publicFireblocksStatus,
  setFireblocksCredentials,
} from "@/lib/fireblocks-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(publicFireblocksStatus());
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    apiKey?: string;
    privateKey?: string;
    baseUrl?: string;
    clear?: boolean;
  };
  if (body.clear) {
    clearFireblocksCredentials();
    return NextResponse.json(publicFireblocksStatus());
  }
  try {
    setFireblocksCredentials({
      apiKey: body.apiKey ?? "",
      privateKey: body.privateKey ?? "",
      baseUrl: body.baseUrl,
    });
    return NextResponse.json(publicFireblocksStatus());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to store credentials" },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "ping") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }
  if (!fireblocksConfigured()) {
    return NextResponse.json({ error: "Fireblocks credentials are not set" }, { status: 400 });
  }
  try {
    const result = await fireblocksGetFirst<unknown>([
      "/v1/vault/accounts_paged?limit=1",
      "/v1/vault/accounts",
      "/v1/transactions?limit=1",
    ]);
    const vaults = extractVaults(result.data);
    return NextResponse.json({
      ok: true,
      ping: result.path,
      vaultCount: vaults.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fireblocks ping failed" },
      { status: 400 },
    );
  }
}
