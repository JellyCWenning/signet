import { extractTransactions, fireblocksGet } from "@/lib/fireblocks-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ txId: string }> }) {
  const { txId } = await context.params;
  if (!txId) {
    return NextResponse.json({ error: "txId is required" }, { status: 400 });
  }
  try {
    const payload = await fireblocksGet<unknown>(
      `/v1/transactions/${encodeURIComponent(txId)}`,
    );
    const transactions = extractTransactions(payload);
    return NextResponse.json({ transaction: transactions[0] ?? payload, raw: payload });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load transaction" },
      { status: 400 },
    );
  }
}
