import type { ProposedAction } from "../trust/types";
import type { GithubPull } from "./types";

export const OPS_AGENT_ID = "ops-autopilot";
export const OPS_AGENT_NAME = "Ops Autopilot";

export function weeklyPlan(goal: string, pulls: GithubPull[]): ProposedAction[] {
  const target = pulls[0] ?? {
    repo: process.env.GITHUB_DEMO_REPO || "acme/billing-api",
    prNumber: Number(process.env.GITHUB_DEMO_PR || 512),
    title: "Completed issues / closed work",
    source: "fixture" as const,
  };
  const goalLine =
    goal.trim() ||
    "Archive completed GitHub issues, notify #engineering, update Notion, and email a weekly summary.";

  return [
    {
      agentId: OPS_AGENT_ID,
      app: "github",
      action: "read",
      summary: "List open GitHub work to archive completed items",
      payload: {},
    },
    {
      agentId: OPS_AGENT_ID,
      app: "github",
      action: "comment",
      summary: `Archive note on ${target.repo}#${target.prNumber}`,
      payload: {
        repo: target.repo,
        prNumber: target.prNumber,
        content: `Ops Autopilot: marking this completed work archived for the weekly close-out.\n\n${goalLine}`,
      },
    },
    {
      agentId: OPS_AGENT_ID,
      app: "slack",
      action: "post",
      summary: "Notify #engineering of the weekly close-out",
      payload: {
        channel: "#engineering",
        body: `Weekly close-out: archived a note on ${target.repo}#${target.prNumber}. Notion page and email summary are next.`,
      },
    },
    {
      agentId: OPS_AGENT_ID,
      app: "notion",
      action: "write",
      summary: "Update the project Notion page with the weekly summary",
      payload: {
        database: "Runbooks",
        page: "Weekly close-out",
        content: `${goalLine}\n\nGitHub: ${target.repo}#${target.prNumber} (${target.title})\nSlack: #engineering notified.`,
      },
    },
    {
      agentId: OPS_AGENT_ID,
      app: "gmail",
      action: "send",
      summary: "Email the weekly report to the ops list",
      payload: {
        to: ["ops@acme.internal", "eng-leads@gmail.com"],
        subject: "Weekly close-out",
        body: `${goalLine}\n\nGitHub ${target.repo}#${target.prNumber}\nSlack #engineering\nNotion Weekly close-out`,
      },
    },
  ];
}
