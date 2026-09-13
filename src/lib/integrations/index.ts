import type { AuditEntry, IntegrationEvent, InterceptRecord } from "../trust/types";
import { runGmail } from "./gmail";
import { runGithub } from "./github";
import { appendNotionAudit, runNotionWrite } from "./notion";
import { withRetry } from "../trust/retry";
import { postSlack } from "./slack";

export type ExecutionMode = "intercept" | "execute" | "reject";

export async function executeDecision(opts: {
  record: InterceptRecord;
  agentName: string;
  audit: AuditEntry;
  mode: ExecutionMode;
}): Promise<IntegrationEvent[]> {
  const events: IntegrationEvent[] = [];
  const { record, agentName, audit, mode } = opts;

  if (mode === "intercept" && record.verdict.decision === "require_approval") {
    events.push(
      await postSlack(
        "approval_request",
        `Aegis hold: ${agentName} wants to ${record.app}:${record.action}\n${record.summary}\nRisk: ${record.verdict.riskLevel} · ${record.id}`,
        process.env.SLACK_APPROVALS_CHANNEL || "#aegis-approvals"
      )
    );
  }

  if (mode === "intercept" && record.verdict.decision === "deny") {
    events.push(
      await postSlack(
        "security_alert",
        `Aegis blocked ${agentName}: ${record.summary}\n${record.verdict.reasons.join(" ")}`,
        process.env.SLACK_ALERTS_CHANNEL || "#security"
      )
    );
  }

  if (mode === "execute") {
    const flakeNotion = Boolean(record.payload.page?.startsWith("Weekly"));
    if (record.app === "gmail") {
      events.push(await withRetry(() => runGmail(record)));
    }
    if (record.app === "slack" && record.action !== "alert") {
      events.push(
        await withRetry(() =>
          postSlack(
            "message_posted",
            record.payload.body ?? record.summary,
            record.payload.channel || "#general"
          )
        )
      );
    }
    if (record.app === "notion" && (record.action === "write" || record.action === "append")) {
      events.push(await withRetry(() => runNotionWrite(record), { injectTimeout: flakeNotion }));
    }
    if (record.app === "github") {
      events.push(await withRetry(() => runGithub(record)));
    }
    events.push(
      await postSlack(
        "audit_ping",
        `Executed ${record.id} · hash ${audit.hash}`,
        process.env.SLACK_AUDIT_CHANNEL || "#aegis-audit"
      )
    );
  }

  if (mode === "reject") {
    events.push(
      await postSlack(
        "rejected",
        `${agentName} was rejected for ${record.summary} (${record.id})`,
        process.env.SLACK_APPROVALS_CHANNEL || "#aegis-approvals"
      )
    );
  }

  events.push(await appendNotionAudit(audit, record, agentName));
  return events.map((ev) => ({ ...ev, interceptId: record.id }));
}
