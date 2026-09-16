import { normalizeCallback, parseCallbackBody } from "@/lib/callback";
import {
  DEFAULT_POLICY,
  DEFAULT_SETTINGS,
  defaultApiUsers,
  defaultCosigners,
  defaultRequests,
  seedAudit,
} from "@/lib/seed";
import type {
  ApiUser,
  AuditEvent,
  BotConnection,
  BotMessage,
  CallbackAction,
  CallbackResponse,
  Cosigner,
  DashboardStats,
  PolicyDecision,
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
  apiUsers: ApiUser[];
  settings: WorkspaceSettings;
  bot: BotConnection;
  botMessages: BotMessage[];
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
    apiUsers: defaultApiUsers(),
    settings: { ...DEFAULT_SETTINGS },
    bot: {
      name: "Northstar Ops Bot",
      kind: "telegram",
      status: "connected",
      chatId: "@northstar_ops",
      autoNotifyHolds: true,
    },
    botMessages: [
      {
        id: "bot_hello",
        at: new Date(now - 60_000).toISOString(),
        direction: "out",
        text: "Ops bot connected. Callback off. TAP is the only gate. Bots sign JWTs with RSA; the enclave signs TAP-allowed transfers.",
      },
    ],
  };
}

function state(): CoSignState {
  if (!globalForStore.__fbCoSign) {
    globalForStore.__fbCoSign = createState();
  }
  const current = globalForStore.__fbCoSign;
  if (!current.bot || !current.botMessages) {
    const fresh = createState();
    current.bot = fresh.bot;
    current.botMessages = fresh.botMessages;
  }
  if (!current.apiUsers) {
    current.apiUsers = defaultApiUsers();
  }
  return current;
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

export function listApiUsers(): ApiUser[] {
  return structuredClone(state().apiUsers);
}

export function listPendingPolicyApprovals(): SignRequest[] {
  return state()
    .requests.filter(
      (request) =>
        request.status === "pending" && request.configType === "POLICY_APPROVAL",
    )
    .map(snapshotRequest);
}

export function pairApiUser(userId: string, cosignerId: string | null): ApiUser {
  const user = state().apiUsers.find((item) => item.id === userId);
  if (!user) throw new Error("API user not found");
  if (user.pairedCosignerId) {
    const previous = state().cosigners.find((item) => item.id === user.pairedCosignerId);
    if (previous && previous.pairedApiUser === user.id) {
      previous.pairedApiUser = "";
      previous.callbackConfigured = false;
    }
  }
  user.pairedCosignerId = cosignerId;
  user.callbackEnabled = false;
  if (cosignerId) {
    const cosigner = state().cosigners.find((item) => item.id === cosignerId);
    if (!cosigner) throw new Error("Co-signer not found");
    cosigner.pairedApiUser = user.id;
    cosigner.callbackConfigured = false;
  }
  record(
    "pairing",
    cosignerId ? "BOT_PAIRED" : "BOT_UNPAIRED",
    state().settings.operatorName,
    `${user.id} ${cosignerId ? `paired to ${cosignerId}` : "unpaired"}`,
  );
  return structuredClone(user);
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

export function getBot(): { bot: BotConnection; messages: BotMessage[] } {
  return {
    bot: { ...state().bot },
    messages: state().botMessages.map((message) => ({ ...message })),
  };
}

export function setBotConnected(connected: boolean): BotConnection {
  state().bot.status = connected ? "connected" : "disconnected";
  pushBot(
    "out",
    connected
      ? "Ops bot reconnected. Callback off. Fireblocks TAP is the gate."
      : "Ops bot disconnected. Transfers still evaluate TAP; held items will not be pinged.",
  );
  return { ...state().bot };
}

function pushBot(direction: BotMessage["direction"], text: string) {
  state().botMessages.push({
    id: `bot_${crypto.randomUUID()}`,
    at: new Date().toISOString(),
    direction,
    text,
  });
}

export function proposeRuleChange(
  id: string,
  patch: { enabled?: boolean; maxUsd?: number | null; name?: string },
): SignRequest {
  const current = state().rules.find((item) => item.id === id);
  if (!current) throw new Error("Policy rule not found");

  const proposed: PolicyRule = structuredClone(current);
  if (patch.enabled != null) proposed.enabled = patch.enabled;
  if (patch.name) proposed.name = patch.name;
  if (patch.maxUsd === null) {
    delete proposed.match.maxUsd;
  } else if (patch.maxUsd != null) {
    proposed.match.maxUsd = patch.maxUsd;
  }

  const summaryParts = [`Update TAP rule "${current.name}"`];
  if (patch.enabled != null && patch.enabled !== current.enabled) {
    summaryParts.push(patch.enabled ? "enable" : "disable");
  }
  if (patch.maxUsd !== undefined && patch.maxUsd !== current.match.maxUsd) {
    summaryParts.push(
      `threshold ${current.match.maxUsd ?? "none"} → ${patch.maxUsd ?? "none"}`,
    );
  }

  const { request } = ingestCallback("config_change", {
    requestId: `req_pol_${crypto.randomUUID().slice(0, 8)}`,
    type: "POLICY_APPROVAL",
    extraInfo: {
      summary: summaryParts.join(" · "),
      submittedBy: state().settings.operatorName,
      ruleId: current.id,
      current,
      proposed,
    },
    signerId: "api_approver_ops",
    players: ["cosigner-sgx-dr-1"],
  });
  return request;
}

function applyApprovedPolicy(request: SignRequest) {
  const extra = request.extraInfo;
  if (!extra) return;
  const ruleId = extra.ruleId;
  const proposed = extra.proposed;
  if (typeof ruleId !== "string" || !proposed || typeof proposed !== "object") {
    return;
  }
  const index = state().rules.findIndex((rule) => rule.id === ruleId);
  if (index === -1) {
    state().rules.push(structuredClone(proposed as PolicyRule));
  } else {
    state().rules[index] = structuredClone(proposed as PolicyRule);
  }
  record(
    request.id,
    "POLICY_APPLIED",
    state().settings.operatorName,
    String(extra.summary ?? "Live TAP updated"),
  );
}

export function proposeNewRule(input: {
  name: string;
  destType: string;
  maxUsd?: number | null;
  decision: PolicyDecision;
  designatedSigner: string;
}): SignRequest {
  const maxPriority = Math.max(...state().rules.map((rule) => rule.priority), 0);
  const destType = input.destType;
  const proposed: PolicyRule = {
    id: `rule_${crypto.randomUUID().slice(0, 8)}`,
    name: input.name,
    description: "Proposed TAP rule awaiting human approval.",
    priority: Math.min(maxPriority, 80) - 1,
    enabled: true,
    match: {
      kinds: destType === "CONFIG" ? ["config_change"] : ["tx_sign"],
      operations: destType === "CONFIG" ? undefined : ["TRANSFER"],
      srcTypes: destType === "CONFIG" ? undefined : ["VAULT"],
      dstTypes: destType === "CONFIG" || destType === "*" ? undefined : [destType],
      dstAddressTypes:
        destType === "ONE_TIME"
          ? ["ONE_TIME"]
          : destType === "VAULT" || destType === "*"
            ? undefined
            : ["WHITELISTED"],
      maxUsd: input.maxUsd ?? undefined,
    },
    decision: input.decision,
    designatedSigner: input.designatedSigner,
  };

  const { request } = ingestCallback("config_change", {
    requestId: `req_pol_${crypto.randomUUID().slice(0, 8)}`,
    type: "POLICY_APPROVAL",
    extraInfo: {
      summary: `Add TAP rule "${proposed.name}" · ${proposed.decision} · ${destType}${
        input.maxUsd != null ? ` ≤ $${input.maxUsd}` : ""
      }`,
      submittedBy: state().settings.operatorName,
      ruleId: proposed.id,
      current: null,
      proposed,
      mode: "add",
    },
    signerId: "api_approver_ops",
    players: ["cosigner-sgx-dr-1"],
  });
  return request;
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

  const request: SignRequest = {
    ...incoming,
    status: "auto_approved",
    decidedAt: incoming.createdAt,
    decisionSource: "policy",
    matchedRuleName: "Fireblocks TAP",
    policyVerdict: "APPROVE",
  };

  state().requests.unshift(request);
  record(
    request.id,
    "CALLBACK_RECEIVED",
    request.cosignerId,
    `${kind} already passed Fireblocks TAP`,
  );
  record(
    request.id,
    "APPROVE",
    "fireblocks-tap",
    "TAP ALLOW — Co-Signer signed in enclave (callback off)",
  );
  if (state().bot.status === "connected") {
    pushBot("out", `Signed ${request.id} · Fireblocks TAP ALLOW · enclave`);
  }

  return {
    response: { action: "APPROVE", requestId: request.id },
    request: snapshotRequest(request),
  };
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

  if (action === "APPROVE" && request.configType === "POLICY_APPROVAL") {
    applyApprovedPolicy(request);
  }

  return snapshotRequest(request);
}

export function handleBotCommand(text: string): { reply: string; request?: SignRequest } {
  const trimmed = text.trim();
  pushBot("in", trimmed);
  const match = trimmed.match(/^\/(approve|reject|ignore)\s+(\S+)/i);
  if (!match) {
    const reply =
      "Commands: /approve <requestId>, /reject <requestId>, /ignore <requestId>";
    pushBot("out", reply);
    return { reply };
  }
  const action = match[1].toUpperCase() as "APPROVE" | "REJECT" | "IGNORE";
  try {
    const request = decideRequest(match[2], action, `Via ${state().bot.name}`);
    const reply = `${action} sent for ${request.id}`;
    pushBot("out", reply);
    return { reply, request };
  } catch (error) {
    const reply = error instanceof Error ? error.message : "Bot command failed";
    pushBot("out", reply);
    return { reply };
  }
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
    action: "RETRY",
    requestId: request.id,
  };
}
