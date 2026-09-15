import { evaluatePolicy } from "@/lib/policy";
import { tapAction } from "@/lib/tap";
import type {
  CallbackAction,
  CallbackResponse,
  PolicyDecision,
  PolicyRule,
  SignRequest,
} from "@/lib/types";

export type TapVerdict = "ALLOW" | "BLOCK" | "2-TIER";

export interface TapDecision {
  verdict: TapVerdict;
  policyDecision: PolicyDecision;
  action: CallbackAction;
  rule?: PolicyRule;
}

/** First matching live TAP rule wins. ALLOW is a pass: return APPROVE to the Co-Signer. */
export function evaluateTap(
  request: Pick<
    SignRequest,
    | "kind"
    | "operation"
    | "sourceType"
    | "destType"
    | "destAddressType"
    | "assetId"
    | "amountUsd"
    | "configType"
  >,
  rules: PolicyRule[],
): TapDecision {
  const { decision, rule } = evaluatePolicy(request, rules);
  return {
    verdict: tapAction(decision),
    policyDecision: decision,
    action: tapToCallbackAction(decision),
    rule,
  };
}

export function tapToCallbackAction(decision: PolicyDecision): CallbackAction {
  if (decision === "APPROVE") return "APPROVE";
  if (decision === "REJECT") return "REJECT";
  return "RETRY";
}

export function callbackFromTap(
  requestId: string,
  decision: TapDecision,
  rejectionReason?: string,
): CallbackResponse {
  if (decision.action === "REJECT") {
    return {
      action: "REJECT",
      requestId,
      rejectionReason:
        rejectionReason ?? decision.rule?.name ?? "Rejected by TAP",
    };
  }
  return { action: decision.action, requestId };
}
