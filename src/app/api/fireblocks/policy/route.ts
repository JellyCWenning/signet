import {
  extractDraftId,
  extractPolicyRules,
  fireblocksGetFirst,
  summarizeRule,
} from "@/lib/fireblocks-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await fireblocksGetFirst<unknown>([
      "/v1/policy/active_policy?policyType=TRANSFER",
      "/v1/policy",
    ]);
    const rules = extractPolicyRules(result.data);
    return NextResponse.json({
      source: result.path.includes("active_policy") ? "v2" : "v1",
      path: result.path,
      draftId: extractDraftId(result.data),
      rules,
      rows: rules.map(summarizeRule),
      raw: result.data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load TAP" },
      { status: 400 },
    );
  }
}
