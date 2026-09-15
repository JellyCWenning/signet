import { listRules, setRuleEnabled } from "@/lib/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listRules());
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id?: string; enabled?: boolean };
    if (!body.id || typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "id and enabled are required" }, { status: 400 });
    }
    return NextResponse.json(setRuleEnabled(body.id, body.enabled));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update rule";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
