import { listRules, proposeRuleChange } from "@/lib/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listRules());
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      enabled?: boolean;
      maxUsd?: number | null;
    };
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const change = proposeRuleChange(body.id, {
      enabled: body.enabled,
      maxUsd: body.maxUsd,
    });
    return NextResponse.json(change);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to propose policy change";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
