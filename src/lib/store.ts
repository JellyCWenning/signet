import { normalizeCallback, parseCallbackBody } from "@/lib/callback";
import { evaluatePolicy, toCallbackAction } from "@/lib/policy";
import {
  DEFAULT_POLICY,
  DEFAULT_SETTINGS,
  defaultCosigners,
  defaultRequests,
  seedAudit,
} from "@/lib/seed";
import type {
  AuditEvent,
  CallbackAction,
  CallbackResponse,
  Cosigner,
  DashboardStats,
  PolicyRule,
  QueueFilters,
  RequestKind,
  SignRequest,
  WorkspaceSettings,
} from "@/lib/types";

interface CoSignState {
  requests: SignRequest[];
  audit: AuditEvent[];
  rules: PolicyRule[];
  cosigners: Cosigner[];
  settings: WorkspaceSettings;
}

const globalForStore = globalThis as typeof globalThis & {
  __fbCoSign?: CoSignState;
};

function createState(now = Date.now()): CoSignState {
  const requests = defaultRequests(now).map((request) => ({
    ...request,
    rawPayload: request.rawPayload ?? {},
  }));
  return {
    requests,
    audit: seedAudit(requests, now),
    rules: structuredClone(DEFAULT_POLICY),
    cosigners: defaultCosigners(now),
    settings: { ...DEFAULT_SETTINGS },
  };
}

function state(): CoSignState {
  if (!globalForStore.__fbCoSign) {
    globalForStore.__fbCoSign = createState();
  }
  return globalForStore.__fbCoSign;
}

function record(
  requestId: string,
  action: string,
  actor: string,
  detail: string,
) {
  state().audit.unshift({
    id: `aud_${crypto.randomUUID()}`,
    at: new Date().toISOString(),
    requestId,
    action,
    actor,
    detail,
  });
}

function snapshotRequest(request: SignRequest): SignRequest {
  return structuredClone(request);
}

export function listRequests(filters: QueueFilters = {}): SignRequest[] {
  return state()
    .requests.filter((request) => {
      if (filters.status && filters.status !== "all" && request.status !== filters.status) {
        return false;
      }
      if (filters.kind && filters.kind !== "all" && request.kind !== filters.kind) {
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(snapshotRequest);
}

export function getRequest(id: string): SignRequest | undefined {
  const found = state().requests.find((request) => request.id === id);
  return found ? snapshotRequest(found) : undefined;
}

export function listAudit(limit = 80): AuditEvent[] {
  return state().audit.slice(0, limit).map((event) => structuredClone(event));
}

export function listRules(): PolicyRule[] {
  return structuredClone(state().rules).sort((a, b) => a.priority - b.priority);
}

export function listCosigners(): Cosigner[] {
  return structuredClone(state().cosigners);
}

export function getSettings(): WorkspaceSettings {
  return { ...state().settings };
}

export function getStats(): DashboardStats {
  const now = Date.now();
  const dayAgo = now - 86_400_000;
  const requests = state().requests;
  const recent = (status: SignRequest["status"]) =>
    requests.filter(
      (request) =>
        request.status === status &&
        request.decidedAt &&
        new Date(request.decidedAt).getTime() >= dayAgo,
    ).length;

  return {
    pending: requests.filter((request) => request.status === "pending").length,
    autoSigned24h: recent("auto_approved"),
    rejected24h: recent("rejected") + recent("auto_rejected"),
    reviewed24h: recent("approved") + recent("rejected"),
    onlineCosigners: state().cosigners.filter((item) => item.status === "online")
      .length,
    totalCosigners: state().cosigners.length,
  };
}

export function setRuleEnabled(id: string, enabled: boolean): PolicyRule {
  const rule = state().rules.find((item) => item.id === id);
  if (!rule) throw new Error("Policy rule not found");
  rule.enabled = enabled;
  record(
    "policy",
    enabled ? "RULE_ENABLED" : "RULE_DISABLED",
    state().settings.operatorName,
    `${rule.name} ${enabled ? "enabled" : "disabled"}`,
  );
  return structuredClone(rule);
}

export function resetStore(): void {
  globalForStore.__fbCoSign = createState();
}

export function ingestCallback(
  kind: RequestKind,
  raw: unknown,
): { response: CallbackResponse; request: SignRequest } {
  const payload = parseCallbackBody(raw);
  const incoming = normalizeCallback(payload, kind);
  const existing = state().requests.find((item) => item.id === incoming.id);

  if (existing) {
    existing.retryCount += 1;
    record(
      existing.id,
      "CALLBACK_RETRY",
      existing.cosignerId,
      `Retry ${existing.retryCount} for ${existing.id}`,
    );
    return {
      response: responseFor(existing),
      request: snapshotRequest(existing),
    };
  }

  const evaluation = evaluatePolicy(incoming, state().rules);
  const request: SignRequest = {
    ...incoming,
    status: "pending",
    matchedRuleId: evaluation.rule?.id,
    matchedRuleName: evaluation.rule?.name,
    policyVerdict: evaluation.decision,
  };

  if (evaluation.decision === "APPROVE") {
    request.status = "auto_approved";
    request.decidedAt = request.createdAt;
    request.decisionSource = "policy";
  } else if (evaluation.decision === "REJECT") {
    request.status = "auto_rejected";
    request.decidedAt = request.createdAt;
    request.decisionSource = "policy";
    request.rejectionReason =
      evaluation.rule?.name ?? "Rejected by co-sign policy";
  }

  state().requests.unshift(request);
  record(
    request.id,
    "CALLBACK_RECEIVED",
    request.cosignerId,
    `${kind} matched ${request.matchedRuleName ?? "default hold"}`,
  );

  if (request.status === "auto_approved") {
    record(
      request.id,
      "APPROVE",
      `policy:${request.matchedRuleId}`,
      `Auto-signed by ${request.matchedRuleName}`,
    );
  } else if (request.status === "auto_rejected") {
    record(
      request.id,
      "REJECT",
      `policy:${request.matchedRuleId}`,
      request.rejectionReason ?? "Auto-rejected",
    );
  }

  return { response: responseFor(request), request: snapshotRequest(request) };
}

export function decideRequest(
  id: string,
  action: Extract<CallbackAction, "APPROVE" | "REJECT" | "IGNORE">,
  reason?: string,
): SignRequest {
  const request = state().requests.find((item) => item.id === id);
  if (!request) throw new Error("Request not found");
  if (request.status !== "pending") {
    throw new Error("Request is no longer awaiting review");
  }
  if (action === "IGNORE" && request.kind === "tx_sign") {
    throw new Error("IGNORE is not valid for transaction signing");
  }

  const operator = state().settings.operatorName;
  request.decisionSource = "operator";
  request.operator = operator;
  request.decidedAt = new Date().toISOString();
  request.rejectionReason = action === "REJECT" ? reason || "Rejected by operator" : reason;

  if (action === "APPROVE") request.status = "approved";
  if (action === "REJECT") request.status = "rejected";
  if (action === "IGNORE") request.status = "ignored";

  record(
    request.id,
    action,
    operator,
    request.rejectionReason ?? `Operator ${action.toLowerCase()}`,
  );

  return snapshotRequest(request);
}

function responseFor(request: SignRequest): CallbackResponse {
  if (request.status === "approved" || request.status === "auto_approved") {
    return { action: "APPROVE", requestId: request.id };
  }
  if (request.status === "rejected" || request.status === "auto_rejected") {
    return {
      action: "REJECT",
      requestId: request.id,
      rejectionReason: request.rejectionReason,
    };
  }
  if (request.status === "ignored") {
    return { action: "IGNORE", requestId: request.id };
  }
  return {
    action: toCallbackAction("REVIEW", request.kind),
    requestId: request.id,
  };
}
