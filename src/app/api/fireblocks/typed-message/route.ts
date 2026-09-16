import { createFireblocksTypedMessage, waitForFireblocksTx } from "@/lib/fireblocks-tx";
import type { Eip712TypedData } from "@/lib/fireblocks-tx";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    vaultId?: string;
    typedData?: Eip712TypedData;
    note?: string;
    assetId?: string;
    wait?: boolean;
  };
  if (!body.vaultId?.trim()) {
    return NextResponse.json({ error: "vaultId is required" }, { status: 400 });
  }
  if (!body.typedData || typeof body.typedData !== "object") {
    return NextResponse.json({ error: "typedData EIP-712 payload is required" }, { status: 400 });
  }
  try {
    const created = await createFireblocksTypedMessage({
      vaultId: body.vaultId,
      typedData: body.typedData,
      note: body.note,
      assetId: body.assetId,
    });
    if (body.wait === false) {
      return NextResponse.json({ ok: true, ...created });
    }
    const waited = await waitForFireblocksTx(created.transaction.id);
    return NextResponse.json({ ok: true, ...waited });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sign typed message" },
      { status: 400 },
    );
  }
}
