import { NextResponse } from "next/server";
import { listTransferHistory } from "@/lib/transfer-history";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 20);
  return NextResponse.json({ records: listTransferHistory(limit) });
}
