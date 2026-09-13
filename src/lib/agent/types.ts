import type { IntegrationEvent, InterceptRecord, ProposedAction, PublicState, VerdictDecision } from "../trust/types";

export type InboxSource = "gmail" | "fixture";
export type GithubSource = "github" | "fixture";

export interface InboxThread {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  source: InboxSource;
}

export interface GithubPull {
  repo: string;
  prNumber: number;
  title: string;
  source: GithubSource;
}

export type AgentLane =
  | "observe"
  | "observe-github"
  | "draft"
  | "slack"
  | "notion"
  | "refuse-secret"
  | "eval-secret"
  | "merge"
  | "comment"
  | "weekly-mail";

export type StepKind = "work" | "eval" | "decision";

export interface PlannedStep {
  lane: AgentLane;
  kind: StepKind;
  thought: string;
  expected: VerdictDecision | "no_send";
  proposed?: ProposedAction;
}

export interface AgentStep {
  lane: AgentLane;
  kind: StepKind;
  thought: string;
  expected: VerdictDecision | "no_send";
  proposed?: ProposedAction;
  record?: InterceptRecord;
  events?: IntegrationEvent[];
  matched?: boolean;
}

export type AgentRunStatus = "running" | "waiting_approval" | "completed";

export interface AgentEval {
  total: number;
  matched: number;
  missed: Array<{ lane: AgentLane; expected: string; actual: string }>;
}

export interface AgentRun {
  id: string;
  agentId: string;
  agentName: string;
  goal: string;
  startedAt: string;
  finishedAt?: string;
  status: AgentRunStatus;
  observation: {
    source: InboxSource;
    liveCount: number;
    threads: InboxThread[];
    note: string;
    githubNote: string;
    pulls: GithubPull[];
    job?: "triage" | "weekly";
    dryRun?: boolean;
    headline?: string;
  };
  steps: AgentStep[];
  eval: AgentEval;
  state?: PublicState;
}
