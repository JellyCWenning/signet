import {
  buildTransferBody,
  extractTransactions,
  fireblocksGet,
  fireblocksPost,
} from "@/lib/fireblocks-store";
import type { CreateTransferInput } from "@/lib/fireblocks-types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit") ?? "25";
  const status = url.searchParams.get("status");
  const query = new URLSearchParams({ limit });
  if (status) query.set("status", status);
  try {
    const payload = await fireblocksGet<unknown>(`/v1/transactions?${query.toString()}`);
    return NextResponse.json({ transactions: extractTransactions(payload), raw: payload });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to list transactions" },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as CreateTransferInput;
  try {
    const transfer = buildTransferBody(body);
    const payload = await fireblocksPost("/v1/transactions", transfer, crypto.randomUUID());
    const transactions = extractTransactions(payload);
    return NextResponse.json({
      ok: true,
      transaction: transactions[0] ?? payload,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create transaction" },
      { status: 400 },
    );
  }
}
