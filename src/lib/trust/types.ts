export type AppId = "gmail" | "slack" | "notion" | "github";

export type DataClass =
  | "email"
  | "phone"
  | "ssn"
  | "credit_card"
  | "api_key"
  | "aws_key"
  | "jwt"
  | "ip"
  | "iban";

export type MinimizeAction = "redact" | "hash" | "drop" | "allow";

export type MinimizationFinding = {
  class: DataClass;
  label: string;
  count: number;
  action: MinimizeAction;
};

export type MinimizationResult = {
  findings: MinimizationFinding[];
  raw: string;
  forModel: string;
  redactedCount: number;
};

export type AgentAction =
  | "read"
  | "draft"
  | "send"
  | "post"
  | "alert"
  | "write"
  | "append"
  | "comment"
  | "merge"
  | "delete";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type VerdictDecision = "allow" | "require_approval" | "deny";

export type AgentRole = "support" | "ops" | "engineering" | "sales" | "admin";

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  allowedApps: AppId[];
}

export interface PolicyCondition {
  apps?: AppId[];
  actions?: AgentAction[];
  agentRoles?: AgentRole[];
  minRecipients?: number;
  externalRecipients?: boolean;
  sensitiveContent?: boolean;
  channels?: string[];
  databases?: string[];
  irreversible?: boolean;
  promptInjection?: boolean;
  dataClasses?: DataClass[];
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  condition: PolicyCondition;
  decision: VerdictDecision;
  minimize?: MinimizeAction;
}

export interface ActionPayload {
  to?: string[];
  subject?: string;
  body?: string;
  channel?: string;
  database?: string;
  page?: string;
  content?: string;
  repo?: string;
  prNumber?: number;
  prTitle?: string;
}

export interface ProposedAction {
  agentId: string;
  app: AppId;
  action: AgentAction;
  summary: string;
  payload: ActionPayload;
  dryRun?: boolean;
}

export interface RiskSignal {
  id: string;
  label: string;
  weight: number;
  detail: string;
}

export interface PipelineStep {
  id: string;
  label: string;
  status: "pass" | "fail" | "hold" | "skip";
  detail: string;
}

export interface Verdict {
  decision: VerdictDecision;
  riskScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
  matchedPolicyIds: string[];
  signals: RiskSignal[];
  steps: PipelineStep[];
  minimization?: MinimizationResult;
}

export interface IntegrationEvent {
  id: string;
  app: AppId;
  at: string;
  kind: string;
  summary: string;
  detail: string;
  ok: boolean;
  interceptId?: string;
  url?: string;
  data?: unknown;
  retries?: number;
  latencyMs?: number;
}

export interface InterceptRecord {
  id: string;
  createdAt: string;
  agentId: string;
  app: AppId;
  action: AgentAction;
  summary: string;
  payload: ActionPayload;
  verdict: Verdict;
  status: "allowed" | "pending" | "denied" | "executed" | "rejected" | "previewed";
  dryRun?: boolean;
  preview?: { resource: string; effect: string };
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
  events?: IntegrationEvent[];
}

export interface AuditEntry {
  id: string;
  at: string;
  interceptId: string;
  event: string;
  actor: string;
  app: AppId;
  summary: string;
  prevHash: string;
  hash: string;
  notionPageId?: string;
}

export interface ConnectedApp {
  id: AppId;
  name: string;
  status: "connected" | "disconnected" | "needs_credentials" | "error";
  description: string;
  lastSyncAt: string;
  capabilities: string[];
  accountLabel?: string;
  oauthConfigured: boolean;
}

export interface StoreState {
  agents: Agent[];
  policies: Policy[];
  intercepts: InterceptRecord[];
  approvals: InterceptRecord[];
  audit: AuditEntry[];
  integrationEvents: IntegrationEvent[];
  apps: ConnectedApp[];
  genesisHash: string;
}

export interface PublicState {
  agents: Agent[];
  policies: Policy[];
  intercepts: InterceptRecord[];
  pending: InterceptRecord[];
  audit: AuditEntry[];
  integrationEvents: IntegrationEvent[];
  apps: ConnectedApp[];
  stats: {
    intercepted: number;
    allowed: number;
    pending: number;
    denied: number;
    executed: number;
  };
  reliability: ReliabilityStats;
}

export interface ReliabilityStats {
  toolCalls: number;
  successes: number;
  failures: number;
  retries: number;
  avgLatencyMs: number;
  policyViolations: number;
  approvals: number;
  blocked: number;
  held: number;
  successRate: number;
  redacted: number;
}
