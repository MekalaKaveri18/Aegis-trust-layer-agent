import { randomUUID } from "crypto";
import { notBeforeOpen } from "../format";
import { intercept } from "../trust/store";
import type { ProposedAction } from "../trust/types";
import { extractPulls } from "./plan";
import type { GithubPull } from "./types";
import { saveRun } from "./runs";
import type { AgentEval, AgentRun, AgentStep } from "./types";
import { OPS_AGENT_ID, OPS_AGENT_NAME, weeklyPlan } from "./weekly";

function evalWeekly(steps: AgentStep[]): AgentEval {
  const missed: AgentEval["missed"] = [];
  let matched = 0;
  for (const step of steps) {
    if (!step.record) continue;
    const actual = step.record.verdict.decision;
    const ok = actual === step.expected;
    step.matched = ok;
    if (ok) matched += 1;
    else missed.push({ lane: step.lane, expected: String(step.expected), actual });
  }
  return { total: steps.filter((s) => s.record).length, matched, missed };
}

const EXPECTED: Record<string, AgentStep["expected"]> = {
  "github:read": "allow",
  "github:comment": "allow",
  "slack:post": "allow",
  "notion:write": "allow",
  "gmail:send": "require_approval",
};

export async function runWeeklyOps(opts: { goal?: string; dryRun?: boolean }): Promise<AgentRun> {
  const dryRun = Boolean(opts.dryRun);
  const goal =
    opts.goal?.trim() ||
    "Archive completed GitHub issues, notify the engineering Slack channel, update the project Notion page, and send a summary email.";

  const run: AgentRun = {
    id: `run-${randomUUID().slice(0, 8)}`,
    agentId: OPS_AGENT_ID,
    agentName: OPS_AGENT_NAME,
    goal,
    startedAt: notBeforeOpen(new Date().toISOString()),
    status: "running",
    observation: {
      source: "fixture",
      liveCount: 0,
      threads: [],
      note: dryRun ? "Dry run — no live APIs. Confirm to execute." : "Weekly close-out executing through Aegis.",
      githubNote: "",
      pulls: [],
      job: "weekly",
      dryRun,
      headline: "",
    },
    steps: [],
    eval: { total: 0, matched: 0, missed: [] },
  };
  await saveRun(run);

  const observe: ProposedAction = {
    agentId: OPS_AGENT_ID,
    app: "github",
    action: "read",
    summary: "List open GitHub work to archive completed items",
    payload: {},
  };
  const listed = await intercept(observe);
  run.steps.push({
    lane: "observe-github",
    kind: "work",
    thought: "See which GitHub items exist before archiving.",
    expected: "allow",
    proposed: observe,
    record: listed.record,
    events: listed.events,
  });
  run.state = listed.state;
  const pulls: GithubPull[] = [];
  for (const ev of listed.events) {
    pulls.push(...extractPulls(ev.data));
  }
  run.observation.pulls = pulls;
  run.observation.githubNote = pulls.length
    ? `Live GitHub: ${pulls.map((p) => `${p.repo}#${p.prNumber}`).join(", ")}`
    : "No live PRs. Archive note uses the labeled fixture repo.";
  await saveRun(run);

  const plan = weeklyPlan(goal, pulls).filter((p) => !(p.app === "github" && p.action === "read"));
  for (const proposed of plan) {
    const result = await intercept({ ...proposed, dryRun });
    const key = `${proposed.app}:${proposed.action}`;
    run.steps.push({
      lane: key === "gmail:send" ? "weekly-mail" : key === "slack:post" ? "slack" : key === "notion:write" ? "notion" : "comment",
      kind: "work",
      thought:
        key === "gmail:send"
          ? "External+internal weekly mail is high-risk. Hold for a human — this is the flagged action."
          : key === "notion:write"
            ? "Notion write. Execution injects one timeout then retries the live call."
            : proposed.summary,
      expected: EXPECTED[key] ?? "allow",
      proposed,
      record: result.record,
      events: result.events,
    });
    run.state = result.state;
    run.eval = evalWeekly(run.steps);
    await saveRun(run);
  }

  const pending = run.steps.some((s) => s.record?.status === "pending");
  const retries = run.steps.flatMap((s) => s.events ?? []).reduce((n, e) => n + (e.retries ?? 0), 0);
  const denies = run.steps.filter((s) => s.record?.verdict.decision === "deny").length;
  run.status = pending ? "waiting_approval" : "completed";
  run.finishedAt = notBeforeOpen(new Date().toISOString());
  run.eval = evalWeekly(run.steps);
  run.observation.headline = dryRun
    ? "Dry run complete. Nothing executed. Confirm to run for real."
    : `Execution completed${retries ? ` with ${retries} automatic retry` : ""} and ${denies} policy violation${denies === 1 ? "" : "s"}.`;
  run.observation.dryRun = dryRun;
  await saveRun(run);
  return run;
}
