export type CallbackAction = "APPROVE" | "REJECT" | "RETRY" | "IGNORE";

export type RequestKind = "tx_sign" | "tx_approval" | "config_change";

export type RequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "auto_approved"
  | "auto_rejected"
  | "ignored";

export type PolicyDecision = "APPROVE" | "REJECT" | "REVIEW";

export type CosignerEnclave =
  | "AWS_NITRO"
  | "INTEL_SGX"
  | "GCP_CONFIDENTIAL_SPACE";

export type CosignerHealth = "online" | "degraded" | "offline";

export interface PolicyMatch {
  kinds?: RequestKind[];
  operations?: string[];
  dstTypes?: string[];
  assets?: string[];
  minUsd?: number;
  maxUsd?: number;
  configTypes?: string[];
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  match: PolicyMatch;
  decision: PolicyDecision;
  designatedSigner: string;
}

export interface SignRequest {
  id: string;
  txId?: string;
  externalTxId?: string;
  kind: RequestKind;
  status: RequestStatus;
  createdAt: string;
  decidedAt?: string;
  slaDeadlineAt: string;
  retryCount: number;
  operation?: string;
  assetId?: string;
  amount?: string;
  amountUsd?: number;
  sourceName?: string;
  sourceId?: string;
  sourceType?: string;
  destName?: string;
  destId?: string;
  destType?: string;
  destAddress?: string;
  destAddressType?: "WHITELISTED" | "ONE_TIME";
  note?: string;
  fee?: string;
  configType?: string;
  extraInfo?: Record<string, unknown>;
  signerId: string;
  cosignerId: string;
  matchedRuleId?: string;
  matchedRuleName?: string;
  policyVerdict?: PolicyDecision;
  decisionSource?: "policy" | "operator";
  operator?: string;
  rejectionReason?: string;
  rawPayload: Record<string, unknown>;
}

export interface AuditEvent {
  id: string;
  at: string;
  requestId: string;
  action: string;
  actor: string;
  detail: string;
}

export interface Cosigner {
  id: string;
  name: string;
  enclave: CosignerEnclave;
  region: string;
  status: CosignerHealth;
  pairedApiUser: string;
  role: "Signer" | "Approver" | "Admin";
  callbackConfigured: boolean;
  lastHeartbeatAt: string;
  signed24h: number;
}

export interface WorkspaceSettings {
  workspaceName: string;
  callbackAuth: "json" | "jwt";
  operatorName: string;
}

export interface CallbackResponse {
  action: CallbackAction;
  requestId: string;
  rejectionReason?: string;
}

export interface QueueFilters {
  status?: RequestStatus | "all";
  kind?: RequestKind | "all";
}

export interface DashboardStats {
  pending: number;
  autoSigned24h: number;
  rejected24h: number;
  reviewed24h: number;
  onlineCosigners: number;
  totalCosigners: number;
}

export interface PolicyPatch {
  ruleId: string;
  summary: string;
  current: PolicyRule;
  proposed: PolicyRule;
}

export interface BotConnection {
  name: string;
  kind: "telegram";
  status: "connected" | "disconnected";
  chatId: string;
  autoNotifyHolds: boolean;
}

export interface BotMessage {
  id: string;
  at: string;
  direction: "in" | "out";
  text: string;
}
