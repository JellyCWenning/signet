import {
  extractDraftId,
  extractPolicyRules,
  fireblocksGet,
  fireblocksPost,
  fireblocksPut,
  summarizeRule,
} from "@/lib/fireblocks-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function policyPayload(payload: unknown) {
  const rules = extractPolicyRules(payload);
  return {
    draftId: extractDraftId(payload),
    rules,
    rows: rules.map(summarizeRule),
    raw: payload,
  };
}

export async function GET() {
  try {
    const payload = await fireblocksGet<unknown>("/v1/policy/draft?policyType=TRANSFER");
    return NextResponse.json({ source: "draft", ...policyPayload(payload) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load TAP draft" },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    rules?: unknown[];
    policyTypes?: string[];
  };
  if (!Array.isArray(body.rules)) {
    return NextResponse.json({ error: "rules array is required" }, { status: 400 });
  }
  try {
    const payload = await fireblocksPut<unknown>(
      "/v1/policy/draft",
      {
        policyTypes: body.policyTypes ?? ["TRANSFER"],
        rules: body.rules,
      },
      crypto.randomUUID(),
    );
    return NextResponse.json({ ok: true, source: "draft", ...policyPayload(payload) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save TAP draft" },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    draftId?: string;
    policyTypes?: string[];
  };
  if (!body.draftId) {
    return NextResponse.json({ error: "draftId is required to publish" }, { status: 400 });
  }
  try {
    const payload = await fireblocksPost<unknown>(
      "/v1/policy/draft",
      {
        policyTypes: body.policyTypes ?? ["TRANSFER"],
        draftId: body.draftId,
      },
      crypto.randomUUID(),
    );
    return NextResponse.json({ ok: true, ...policyPayload(payload), raw: payload });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to publish TAP" },
      { status: 400 },
    );
  }
}
