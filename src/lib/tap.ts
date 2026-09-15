import { formatUsd } from "@/lib/format";
import type { PolicyDecision, PolicyRule } from "@/lib/types";

export function tapAction(decision: PolicyDecision): "ALLOW" | "BLOCK" | "2-TIER" {
  if (decision === "APPROVE") return "ALLOW";
  if (decision === "REJECT") return "BLOCK";
  return "2-TIER";
}

export function sourceLabel(rule: PolicyRule): string {
  if (!rule.match.srcTypes?.length) return "*";
  return rule.match.srcTypes.join(" / ");
}

export function destLabel(rule: PolicyRule): string {
  if (rule.match.dstAddressTypes?.includes("ONE_TIME")) return "ONE_TIME";
  if (!rule.match.dstTypes?.length) return "*";
  return rule.match.dstTypes.join(" / ");
}

export function assetLabel(rule: PolicyRule): string {
  return rule.match.assets?.length ? rule.match.assets.join(", ") : "*";
}

export function amountLabel(rule: PolicyRule): string {
  if (rule.match.maxUsd != null && rule.match.minUsd != null) {
    return `${formatUsd(rule.match.minUsd)}–${formatUsd(rule.match.maxUsd)} USD`;
  }
  if (rule.match.maxUsd != null) return `≤ ${formatUsd(rule.match.maxUsd)} USD`;
  if (rule.match.minUsd != null) return `≥ ${formatUsd(rule.match.minUsd)} USD`;
  return "*";
}

export function typeLabel(rule: PolicyRule): string {
  if (rule.match.configTypes?.length) return rule.match.configTypes.join(" / ");
  if (rule.match.operations?.length) return rule.match.operations.join(" / ");
  return "*";
}
