import { decideRequest, getRequest } from "@/lib/store";
import { NextResponse } from "next/server";
import type { CallbackAction } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const item = getRequest(id);
  if (!item) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const body = (await request.json()) as {
      action?: CallbackAction;
      reason?: string;
    };
    if (body.action !== "APPROVE" && body.action !== "REJECT" && body.action !== "IGNORE") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
    const updated = decideRequest(id, body.action, body.reason);
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to decide";
    const status = message === "Request not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
