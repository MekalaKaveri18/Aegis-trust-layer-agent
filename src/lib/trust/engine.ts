import type {
  ActionPayload,
  Agent,
  AgentAction,
  AppId,
  DataClass,
  MinimizeAction,
  PipelineStep,
  Policy,
  ProposedAction,
  RiskLevel,
  RiskSignal,
  Verdict,
  VerdictDecision,
} from "./types";
import { isBeforePacificOpen } from "../format";
import { detectInjection } from "./injection";
import { detectDataClasses, minimizeProposed } from "./minimize";

const SENSITIVE =
  /\b(ssn|social security|password|wire transfer|routing number|confidential|secret key|api[_-]?key|credit card|ssn)\b/i;

const EXTERNAL_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];
const INTERNAL_DOMAINS = ["argalabs.dev", "lemma.ai", "acme.internal"];

export function isSensitive(text: string | undefined): boolean {
  return Boolean(text && SENSITIVE.test(text));
}

export function recipientMeta(payload: ActionPayload) {
  const to = payload.to ?? [];
  const external = to.filter((addr) => {
    const domain = addr.split("@")[1]?.toLowerCase() ?? "";
    if (!domain) return false;
    if (INTERNAL_DOMAINS.includes(domain)) return false;
    return EXTERNAL_DOMAINS.includes(domain) || !domain.endsWith(".internal");
  });
  return { count: to.length, externalCount: external.length, external: external.length > 0 };
}

export function collectSignals(proposed: ProposedAction): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const text = [
    proposed.summary,
    proposed.payload.subject,
    proposed.payload.body,
    proposed.payload.content,
  ]
    .filter(Boolean)
    .join("\n");
  const recipients = recipientMeta(proposed.payload);

  if (proposed.action === "send") {
    signals.push({
      id: "outbound-send",
      label: "Outbound send",
      weight: 28,
      detail: "Message would leave the organization.",
    });
  }
  if (proposed.action === "merge") {
    signals.push({
      id: "irreversible-merge",
      label: "Irreversible merge",
      weight: 48,
      detail: "Merging a pull request cannot be undone cleanly.",
    });
  }
  if (proposed.action === "delete") {
    signals.push({
      id: "destructive",
      label: "Destructive action",
      weight: 45,
      detail: "Delete operations are treated as high risk.",
    });
  }
  if (recipients.count >= 50) {
    signals.push({
      id: "mass-send",
      label: "Mass recipients",
      weight: 38,
      detail: `${recipients.count} recipients exceeds the mass-send threshold.`,
    });
  } else if (recipients.count >= 8) {
    signals.push({
      id: "bulk-send",
      label: "Bulk recipients",
      weight: 22,
      detail: `${recipients.count} recipients in a single send.`,
    });
  }
  if (recipients.external) {
    signals.push({
      id: "external-recipients",
      label: "External recipients",
      weight: 20,
      detail: `${recipients.externalCount} address(es) outside the company domain.`,
    });
  }
  if (isSensitive(text)) {
    signals.push({
      id: "sensitive-content",
      label: "Sensitive content",
      weight: 36,
      detail: "Body matches secrets, financial, or confidential patterns.",
    });
  }
  if (proposed.app === "slack" && proposed.payload.channel === "#general") {
    signals.push({
      id: "public-channel",
      label: "Company-wide channel",
      weight: 16,
      detail: "Posts to #general are visible to everyone.",
    });
  }
  if (proposed.app === "notion" && proposed.payload.database === "Policies") {
    signals.push({
      id: "policy-mutation",
      label: "Policy mutation",
      weight: 40,
      detail: "Policies are human-owned and must not be rewritten by agents.",
    });
  }
  if (proposed.action === "read" || proposed.action === "draft") {
    signals.push({
      id: "read-or-draft",
      label: "Non-executing action",
      weight: -18,
      detail: "Reads and drafts do not change production systems.",
    });
  }

  if (isBeforePacificOpen()) {
    signals.push({
      id: "off-hours",
      label: "Off-hours",
      weight: 10,
      detail: "Action requested before 10:12 AM Pacific.",
    });
  }

  const injection = detectInjection(
    proposed.summary,
    proposed.payload.subject,
    proposed.payload.body,
    proposed.payload.content
  );
  if (injection) {
    signals.push({
      id: `injection-${injection.id}`,
      label: injection.label,
      weight: 80,
      detail: injection.detail,
    });
  }

  return signals;
}

export function scoreToLevel(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 28) return "medium";
  return "low";
}

function matchesPolicy(policy: Policy, proposed: ProposedAction, agent: Agent): boolean {
  const c = policy.condition;
  if (c.apps && !c.apps.includes(proposed.app)) return false;
  if (c.actions && !c.actions.includes(proposed.action)) return false;
  if (c.agentRoles && !c.agentRoles.includes(agent.role)) return false;
  const recipients = recipientMeta(proposed.payload);
  if (c.minRecipients != null && recipients.count < c.minRecipients) return false;
  if (c.externalRecipients && !recipients.external) return false;
  const text = [
    proposed.payload.subject,
    proposed.payload.body,
    proposed.payload.content,
    proposed.summary,
    ...(proposed.payload.to ?? []),
  ]
    .filter(Boolean)
    .join(" ");
  if (c.sensitiveContent && !isSensitive(text)) return false;
  if (c.channels) {
    if (!proposed.payload.channel || !c.channels.includes(proposed.payload.channel)) return false;
  }
  if (c.databases) {
    if (!proposed.payload.database || !c.databases.includes(proposed.payload.database)) return false;
  }
  if (c.promptInjection && !detectInjection(text)) return false;
  if (c.dataClasses?.length) {
    const found = detectDataClasses(text);
    if (!c.dataClasses.some((cls) => found.has(cls))) return false;
  }
  if (c.irreversible) {
    const irreversible = proposed.action === "merge" || proposed.action === "delete" || proposed.action === "send";
    if (!irreversible) return false;
  }
  return true;
}

function defaultDecision(level: RiskLevel, action: AgentAction): VerdictDecision {
  if (action === "read" || action === "draft") return "allow";
  if (level === "critical") return "deny";
  if (level === "high" || level === "medium") return "require_approval";
  return "allow";
}

export function evaluate(proposed: ProposedAction, agent: Agent | undefined, policies: Policy[]): Verdict {
  const steps: PipelineStep[] = [];

  if (!agent) {
    return {
      decision: "deny",
      riskScore: 100,
      riskLevel: "critical",
      reasons: ["Unknown agent identity."],
      matchedPolicyIds: [],
      signals: [],
      steps: [
        {
          id: "identity",
          label: "Verify agent identity",
          status: "fail",
          detail: "No registered agent matched this request.",
        },
      ],
    };
  }

  steps.push({
    id: "identity",
    label: "Verify agent identity",
    status: "pass",
    detail: `${agent.name} (${agent.role}) is registered.`,
  });

  if (!agent.allowedApps.includes(proposed.app)) {
    steps.push({
      id: "permissions",
      label: "Check app permissions",
      status: "fail",
      detail: `${agent.name} is not entitled to ${proposed.app}.`,
    });
    return {
      decision: "deny",
      riskScore: 90,
      riskLevel: "critical",
      reasons: [`Agent is not permitted to use ${proposed.app}.`],
      matchedPolicyIds: [],
      signals: [],
      steps,
    };
  }

  steps.push({
    id: "permissions",
    label: "Check app permissions",
    status: "pass",
    detail: `${proposed.app} is in the agent’s allowlist.`,
  });

  const injection = detectInjection(
    proposed.summary,
    proposed.payload.subject,
    proposed.payload.body,
    proposed.payload.content
  );
  if (injection) {
    steps.push({
      id: "injection",
      label: "Prompt-injection screen",
      status: "fail",
      detail: injection.detail,
    });
  } else {
    steps.push({
      id: "injection",
      label: "Prompt-injection screen",
      status: "pass",
      detail: "No override, bypass, or hidden-instruction patterns.",
    });
  }

  const signals = collectSignals(proposed);
  const riskScore = Math.max(0, Math.min(100, signals.reduce((sum, s) => sum + s.weight, 12)));
  const riskLevel = scoreToLevel(riskScore);

  steps.push({
    id: "risk",
    label: "Score risk signals",
    status: riskLevel === "critical" ? "fail" : riskLevel === "low" ? "pass" : "hold",
    detail: `Score ${riskScore} (${riskLevel}) from ${signals.length} signal(s).`,
  });

  const matched = policies
    .filter((p) => p.enabled)
    .sort((a, b) => b.priority - a.priority)
    .filter((p) => matchesPolicy(p, proposed, agent));

  let decision = defaultDecision(riskLevel, proposed.action);
  if (matched.length > 0) {
    decision = matched[0].decision;
  }

  steps.push({
    id: "policy",
    label: "Match policy pack",
    status: matched.length ? "pass" : "skip",
    detail: matched.length
      ? `Highest-priority match: ${matched[0].name}.`
      : "No explicit policy; using risk thresholds.",
  });

  const classActions: Partial<Record<DataClass, MinimizeAction>> = {};
  for (const policy of [...matched].reverse()) {
    if (!policy.minimize || !policy.condition.dataClasses) continue;
    for (const dataClass of policy.condition.dataClasses) {
      classActions[dataClass] = policy.minimize;
    }
  }
  const minimization = minimizeProposed(proposed, classActions);
  const minimizeStatus =
    minimization.findings.some((f) => f.class === "api_key" || f.class === "aws_key" || f.class === "jwt") &&
    decision === "deny"
      ? "fail"
      : minimization.redactedCount
        ? "pass"
        : "skip";
  steps.push({
    id: "minimize",
    label: "Minimize before the model",
    status: minimizeStatus,
    detail: minimization.redactedCount
      ? `Redacted ${minimization.redactedCount} sensitive value(s) (${minimization.findings
          .map((f) => f.label)
          .join(", ")}). The model never sees the raw fields.`
      : "No PII or secrets in the model-facing payload.",
  });

  const reasons: string[] = [];
  if (matched[0]) reasons.push(`Policy “${matched[0].name}” → ${decision.replace("_", " ")}.`);
  else reasons.push(`Risk ${riskLevel} (${riskScore}) mapped to ${decision.replace("_", " ")}.`);
  for (const s of signals.filter((x) => x.weight >= 16)) {
    reasons.push(s.detail);
  }

  steps.push({
    id: "gate",
    label: "Approval gate",
    status: decision === "deny" ? "fail" : decision === "require_approval" ? "hold" : "pass",
    detail:
      decision === "allow"
        ? "Action may proceed. Execution will be logged."
        : decision === "require_approval"
        ? "Held for a human approver."
        : "Blocked. Sensitive data does not reach the model, and the tool is not called.",
  });

  steps.push({
    id: "audit",
    label: "Write audit trail",
    status: "pass",
    detail: "Hash-chained entry queued for the audit log.",
  });

  return {
    decision,
    riskScore,
    riskLevel,
    reasons,
    matchedPolicyIds: matched.map((p) => p.id),
    signals,
    steps,
    minimization,
  };
}

export function actionVerb(app: AppId, action: AgentAction): string {
  const map: Record<string, string> = {
    "gmail:read": "Read Gmail",
    "gmail:draft": "Draft Gmail message",
    "gmail:send": "Send Gmail message",
    "slack:post": "Post to Slack",
    "slack:alert": "Send Slack alert",
    "notion:read": "Read Notion",
    "notion:write": "Write Notion page",
    "notion:append": "Append Notion log",
    "github:read": "Read GitHub",
    "github:comment": "Comment on GitHub",
    "github:merge": "Merge GitHub pull request",
  };
  return map[`${app}:${action}`] ?? `${action} on ${app}`;
}
