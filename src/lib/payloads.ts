import { getBot, getSettings, getStats, listApiUsers, listAudit, listCosigners, listRequests } from "@/lib/store";

export function workspacePayload() {
  return {
    settings: getSettings(),
    stats: getStats(),
    cosigners: listCosigners(),
    apiUsers: listApiUsers(),
  };
}

export function recentSigned() {
  return listRequests({ status: "auto_approved" }).slice(0, 8);
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
