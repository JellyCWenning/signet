import { listRequests } from "@/lib/store";
import { NextResponse } from "next/server";
import type { RequestKind, RequestStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") ?? "all") as RequestStatus | "all";
  const kind = (searchParams.get("kind") ?? "all") as RequestKind | "all";
  return NextResponse.json(listRequests({ status, kind }));
}
