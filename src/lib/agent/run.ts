import { randomUUID } from "crypto";
import { notBeforeOpen } from "../format";
import { intercept } from "../trust/store";
import type { IntegrationEvent } from "../trust/types";
import {
  buildTriagePlan,
  ensureTriageCoverage,
  extractPulls,
  extractThreads,
  SUPPORT_AGENT_ID,
  SUPPORT_AGENT_NAME,
} from "./plan";
import { saveRun } from "./runs";
import type { AgentEval, AgentRun, AgentStep, PlannedStep } from "./types";

function fromEvents<T>(events: IntegrationEvent[], pick: (data: unknown) => T[]): T[] {
  for (const ev of events) {
    const hit = pick(ev.data);
    if (hit.length) return hit;
  }
  return [];
}

function evalRun(steps: AgentStep[]): AgentEval {
  const missed: AgentEval["missed"] = [];
  let matched = 0;
  for (const step of steps) {
    if (step.kind === "decision") {
      const ok = step.expected === "no_send";
      step.matched = ok;
      if (ok) matched += 1;
      else missed.push({ lane: step.lane, expected: String(step.expected), actual: "sent" });
      continue;
    }
    if (!step.record) continue;
    const actual = step.record.verdict.decision;
    const ok = actual === step.expected;
    step.matched = ok;
    if (ok) matched += 1;
    else missed.push({ lane: step.lane, expected: String(step.expected), actual });
  }
  return { total: steps.length, matched, missed };
}

async function submit(run: AgentRun, planned: PlannedStep) {
  if (!planned.proposed) {
    const step: AgentStep = {
      lane: planned.lane,
      kind: planned.kind,
      thought: planned.thought,
      expected: planned.expected,
      proposed: planned.proposed,
    };
    run.steps.push(step);
    run.eval = evalRun(run.steps);
    await saveRun(run);
    return;
  }
  const result = await intercept(planned.proposed);
  const step: AgentStep = {
    lane: planned.lane,
    kind: planned.kind,
    thought: planned.thought,
    expected: planned.expected,
    proposed: planned.proposed,
    record: result.record,
    events: result.events,
  };
  run.steps.push(step);
  run.state = result.state;
  run.eval = evalRun(run.steps);
  const pending = run.steps.some((s) => s.record?.status === "pending");
  run.status = pending ? "waiting_approval" : "running";
  await saveRun(run);
}

export async function runSupportCopilot(goal: string): Promise<AgentRun> {
  const run: AgentRun = {
    id: `run-${randomUUID().slice(0, 8)}`,
    agentId: SUPPORT_AGENT_ID,
    agentName: SUPPORT_AGENT_NAME,
    goal: goal.trim() || "Triage inbound support and update the team across Gmail, Slack, Notion, and GitHub.",
    startedAt: notBeforeOpen(new Date().toISOString()),
    status: "running",
    observation: {
      source: "fixture",
      liveCount: 0,
      threads: [],
      note: "",
      githubNote: "",
      pulls: [],
    },
    steps: [],
    eval: { total: 0, matched: 0, missed: [] },
  };
  await saveRun(run);

  await submit(run, {
    lane: "observe",
    kind: "work",
    expected: "allow",
    thought: "Observe Gmail through Aegis before planning.",
    proposed: {
      agentId: SUPPORT_AGENT_ID,
      app: "gmail",
      action: "read",
      summary: "Read unread threads in support inbox",
      payload: { to: ["support@acme.internal"] },
    },
  });

  await submit(run, {
    lane: "observe-github",
    kind: "work",
    expected: "allow",
    thought: "Observe open pull requests through Aegis. Merge target comes from this list when GitHub is connected.",
    proposed: {
      agentId: SUPPORT_AGENT_ID,
      app: "github",
      action: "read",
      summary: "List open pull requests for the connected GitHub account",
      payload: {},
    },
  });

  const gmailStep = run.steps.find((s) => s.lane === "observe");
  const ghStep = run.steps.find((s) => s.lane === "observe-github");
  const live = fromEvents(gmailStep?.events ?? [], (d) => extractThreads(d, "gmail"));
  const pulls = fromEvents(ghStep?.events ?? [], extractPulls);
  const packed = ensureTriageCoverage(live);
  run.observation = {
    source: packed.source,
    liveCount: packed.liveCount,
    threads: packed.threads,
    note: packed.note,
    pulls,
    githubNote: pulls.length
      ? `GitHub live: ${pulls.map((p) => `${p.repo}#${p.prNumber}`).join(", ")}`
      : "GitHub disconnected or no open PRs. Merge hold uses a labeled fixture repo.",
  };
  await saveRun(run);

  const plan = buildTriagePlan(run.goal, packed.threads, pulls);
  for (const item of plan) {
    await submit(run, item);
  }

  const pending = run.steps.some((s) => s.record?.status === "pending");
  run.status = pending ? "waiting_approval" : "completed";
  run.finishedAt = notBeforeOpen(new Date().toISOString());
  run.eval = evalRun(run.steps);
  await saveRun(run);
  return run;
}

export { evalRun };
