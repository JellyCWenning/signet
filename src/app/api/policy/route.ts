import { listPendingPolicyApprovals, listRules, proposeNewRule, proposeRuleChange } from "@/lib/store";
import { NextResponse } from "next/server";
import type { PolicyDecision } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    rules: listRules(),
    pending: listPendingPolicyApprovals(),
  });
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      destType?: string;
      maxUsd?: number | null;
      decision?: PolicyDecision;
      designatedSigner?: string;
    };
    if (!body.name || !body.destType || !body.decision || !body.designatedSigner) {
      return NextResponse.json(
        { error: "name, destType, decision, and designatedSigner are required" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      proposeNewRule({
        name: body.name,
        destType: body.destType,
        maxUsd: body.maxUsd,
        decision: body.decision,
        designatedSigner: body.designatedSigner,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to propose TAP rule";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
