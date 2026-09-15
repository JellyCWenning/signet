import { getBot, getSettings, getStats, listApiUsers, listAudit, listCosigners, listPendingPolicyApprovals, listRequests, listRules } from "@/lib/store";

export function workspacePayload() {
  return {
    settings: getSettings(),
    stats: getStats(),
    cosigners: listCosigners(),
    apiUsers: listApiUsers(),
  };
}

export function policyPayload() {
  return {
    rules: listRules(),
    pending: listPendingPolicyApprovals(),
  };
}

export function botPayload() {
  return getBot();
}

export function pendingQueue() {
  return listRequests({ status: "pending" });
}

export function allRequests() {
  return listRequests();
}

export function auditPayload() {
  return listAudit();
}
