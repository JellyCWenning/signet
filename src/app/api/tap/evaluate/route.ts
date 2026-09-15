import { normalizeCallback, parseCallbackBody } from "@/lib/callback";
import { evaluateTap } from "@/lib/tap-engine";
import { listRules } from "@/lib/store";
import { NextResponse } from "next/server";
import type { RequestKind } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const body = raw as { kind?: RequestKind };
    const kind: RequestKind =
      body.kind === "config_change" || body.kind === "tx_approval"
        ? body.kind
        : "tx_sign";
    const incoming = normalizeCallback(parseCallbackBody(raw), kind);
    const decision = evaluateTap(incoming, listRules());
    return NextResponse.json({
      requestId: incoming.id,
      verdict: decision.verdict,
      action: decision.action,
      passed: decision.verdict === "ALLOW",
      rule: decision.rule
        ? {
            id: decision.rule.id,
            name: decision.rule.name,
            decision: decision.rule.decision,
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to evaluate TAP";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
