import type { PolicyDecision, PolicyRule, SignRequest } from "@/lib/types";

export interface PolicyEvaluation {
  decision: PolicyDecision;
  rule?: PolicyRule;
}

export function evaluatePolicy(
  request: Pick<
    SignRequest,
    "kind" | "operation" | "destType" | "assetId" | "amountUsd" | "configType"
  >,
  rules: PolicyRule[],
): PolicyEvaluation {
  const enabled = [...rules]
    .filter((rule) => rule.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of enabled) {
    if (matches(request, rule)) {
      return { decision: rule.decision, rule };
    }
  }

  return { decision: "REVIEW" };
}

function matches(
  request: Pick<
    SignRequest,
    "kind" | "operation" | "destType" | "assetId" | "amountUsd" | "configType"
  >,
  rule: PolicyRule,
): boolean {
  const { match } = rule;
  if (match.kinds?.length && !match.kinds.includes(request.kind)) return false;
  if (
    match.operations?.length &&
    (!request.operation || !match.operations.includes(request.operation))
  ) {
    return false;
  }
  if (
    match.dstTypes?.length &&
    (!request.destType || !match.dstTypes.includes(request.destType))
  ) {
    return false;
  }
  if (
    match.assets?.length &&
    (!request.assetId || !match.assets.includes(request.assetId))
  ) {
    return false;
  }
  if (
    match.configTypes?.length &&
    (!request.configType || !match.configTypes.includes(request.configType))
  ) {
    return false;
  }
  if (match.minUsd != null && (request.amountUsd ?? 0) < match.minUsd) {
    return false;
  }
  if (match.maxUsd != null && (request.amountUsd ?? 0) > match.maxUsd) {
    return false;
  }
  return true;
}

export function toCallbackAction(
  decision: PolicyDecision,
  kind: SignRequest["kind"],
): "APPROVE" | "REJECT" | "RETRY" | "IGNORE" {
  if (decision === "APPROVE") return "APPROVE";
  if (decision === "REJECT") return "REJECT";
  if (kind === "tx_sign") return "RETRY";
  return "RETRY";
}
