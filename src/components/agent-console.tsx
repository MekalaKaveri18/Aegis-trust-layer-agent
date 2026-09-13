"use client";

import { runSupportAgent, runWeeklyAgent } from "@/lib/client";
import { useAegis } from "./state-provider";
import { AppLogo } from "./brand-logos";
import { ConnectorMark, FanoutMark, VerdictMark } from "./status";
import { PageHeader, Panel, PanelTitle, ProductBody } from "./page-header";
import type { AgentRun, AgentStep } from "@/lib/agent/types";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import Link from "next/link";

const DEFAULT_GOAL =
  "Triage inbound support and update the team across Gmail, Slack, Notion, and GitHub.";

function laneLabel(lane: string) {
  const map: Record<string, string> = {
    observe: "Read Gmail",
    "observe-github": "Read GitHub",
    draft: "Draft reply",
    slack: "Post Slack",
    notion: "Write Notion",
    "refuse-secret": "Refuse secrets",
    "eval-secret": "Eval: secret send",
    merge: "Merge GitHub",
    comment: "Comment GitHub",
    "weekly-mail": "Weekly email",
  };
  return map[lane] ?? lane;
}

function kindLabel(kind: AgentStep["kind"]) {
  if (kind === "eval") return "EVAL";
  if (kind === "decision") return "AGENT";
  return "WORK";
}

function StepRow({ step }: { step: AgentStep }) {
  const record = step.record;
  const live = record?.events?.filter((e) => !step.proposed || e.app === step.proposed.app) ?? [];
  return (
    <li className="border-b border-[#ececec] px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.12em] text-[#8a8a8a]">
            {kindLabel(step.kind)} · {laneLabel(step.lane)}
          </p>
          <p className="mt-1 text-[13px] text-[#0c0c0c]">{step.thought}</p>
          {step.proposed ? <p className="mt-1 text-[12px] text-[#737373]">{step.proposed.summary}</p> : null}
          {record?.dryRun && record.preview ? (
            <p className="mt-1 font-mono text-[11px] text-[#8a8a8a]">
              DRY RUN · {record.preview.effect} → {record.preview.resource}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          {step.kind === "decision" ? (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-[0.08em] text-emerald-700">
              NO SEND
            </span>
          ) : record ? (
            <VerdictMark decision={record.verdict.decision} />
          ) : null}
          {step.matched === true ? (
            <span className="font-mono text-[10px] tracking-[0.08em] text-emerald-700">GATE MATCH</span>
          ) : step.matched === false ? (
            <span className="font-mono text-[10px] tracking-[0.08em] text-amber-700">GATE MISS</span>
          ) : null}
        </div>
      </div>
      {live.length ? (
        <ul className="mt-2 space-y-1">
          {live.map((ev) => (
            <li key={ev.id} className="flex items-center gap-2 text-[12px] text-[#737373]">
              <FanoutMark ok={ev.ok} />
              <span className="min-w-0 truncate">{ev.summary}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

const WEEKLY_GOAL =
  "Archive completed GitHub issues, notify the engineering Slack channel, update the project Notion page, and send a summary email.";

export function AgentConsole() {
  const { state, setState, refresh } = useAegis();
  const [job, setJob] = useState<"triage" | "weekly">("weekly");
  const [goal, setGoal] = useState(WEEKLY_GOAL);
  const [run, setRun] = useState<AgentRun | null>(null);
  const [busy, setBusy] = useState(false);
  const connected = state.apps.filter((a) => a.status === "connected");
  const rel = state.reliability;

  useEffect(() => {
    void fetch("/api/agent/run", { cache: "no-store" })
      .then((r) => r.json())
      .then((body: { run: AgentRun | null }) => {
        if (body.run) setRun(body.run);
      })
      .catch(() => undefined);
  }, []);

  async function start(dryRun: boolean) {
    setBusy(true);
    try {
      const result =
        job === "weekly" ? await runWeeklyAgent(goal, dryRun) : await runSupportAgent(goal);
      setRun(result.run);
      if (result.run.state) setState(result.run.state);
      else await refresh();
      toast.message(result.run.observation.headline || `Gates ${result.run.eval.matched}/${result.run.eval.total}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Agent failed");
    } finally {
      setBusy(false);
    }
  }

  const pending = run?.steps.some((s) => s.record?.status === "pending");
  const dry = run?.observation.dryRun;

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Agents"
        description="Agents call tools through Aegis. Tool results are minimized before they reach the model. Dry-run first."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/eval" className="btn-quiet">
              Eval
            </Link>
            {job === "weekly" ? (
              <>
                <button type="button" disabled={busy} onClick={() => void start(true)} className="btn-quiet">
                  {busy ? "Working…" : "Dry run"}
                </button>
                <button type="button" disabled={busy} onClick={() => void start(false)} className="btn-primary">
                  {busy ? "Working…" : "Execute"}
                </button>
              </>
            ) : (
              <button type="button" disabled={busy} onClick={() => void start(false)} className="btn-primary">
                {busy ? "Running…" : "Run triage"}
              </button>
            )}
          </div>
        }
      />
      <ProductBody className="space-y-5">
        <div className="seg">
          <button
            type="button"
            data-active={job === "weekly"}
            onClick={() => {
              setJob("weekly");
              setGoal(WEEKLY_GOAL);
            }}
          >
            Weekly ops
          </button>
          <button
            type="button"
            data-active={job === "triage"}
            onClick={() => {
              setJob("triage");
              setGoal(DEFAULT_GOAL);
            }}
          >
            Support triage
          </button>
        </div>
        <label className="block">
          <span className="kicker">Goal</span>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={2}
            className="field mt-1.5 min-h-[64px] py-2"
          />
        </label>

        {rel ? (
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#e8e8e8] bg-black/[0.04] sm:grid-cols-4">
            {[
              ["Success", `${rel.successRate}%`],
              ["Redacted", String(rel.redacted)],
              ["Violations", String(rel.policyViolations)],
              ["Latency", `${rel.avgLatencyMs}ms`],
            ].map(([label, value]) => (
              <div key={label} className="bg-white px-3.5 py-2.5">
                <p className="text-[11px] text-[#8a8a8a]">{label}</p>
                <p className="mt-0.5 text-[13px] font-medium tabular-nums tracking-tight">{value}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {state.apps.map((app) => (
            <Link key={app.id} href={app.status === "connected" ? "/apps" : `/connect/${app.id}`} className="inline-flex items-center gap-2 text-[12px] text-[#555]">
              <AppLogo app={app.id} className="size-4" />
              {app.name}
              <ConnectorMark healthy={app.status === "connected"} />
            </Link>
          ))}
        </div>
        {connected.length === 0 ? (
          <p className="text-[13px] text-[#737373]">
            No connectors yet. The agent still runs: Aegis will minimize, allow, deny, and hold. Live API calls fail closed until you connect apps.
          </p>
        ) : null}

        {run ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Panel>
              <PanelTitle>
                {run.id} · {run.status.replace("_", " ")} · gates {run.eval.matched}/{run.eval.total}
              </PanelTitle>
              <ol>
                {run.steps.map((step, i) => (
                  <StepRow key={`${step.lane}-${i}`} step={step} />
                ))}
              </ol>
            </Panel>
            <div className="space-y-4">
              <Panel>
                <PanelTitle>Observation</PanelTitle>
                <div className="space-y-2 px-4 py-3 text-[13px] text-[#333]">
                  <p className="text-[#0c0c0c]">{run.observation.headline}</p>
                  <p className="text-[#737373]">{dry ? "Dry-run preview. Live APIs were not called for writes." : run.observation.note}</p>
                  <p className="text-[#737373]">{run.observation.githubNote}</p>
                  {run.observation.pulls?.length ? (
                    <p className="font-mono text-[11px] text-[#8a8a8a]">
                      {run.observation.pulls.map((p) => `${p.repo}#${p.prNumber}`).join(" · ")}
                    </p>
                  ) : null}
                  {run.observation.threads.map((t) => (
                    <div key={t.id} className="rounded-md border border-[#ececec] px-3 py-2">
                      <p className="text-[12px] text-[#0c0c0c]">{t.subject}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-[#8a8a8a]">
                        {t.source} · {t.from || "unknown sender"}
                      </p>
                      <p className="mt-1 text-[12px] text-[#737373]">{t.snippet}</p>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel>
                <PanelTitle>What “works” means</PanelTitle>
                <div className="space-y-2 px-4 py-3 text-[13px] leading-relaxed text-[#5f5f5f]">
                  <p>
                    Gates score work steps, the agent’s secret refusal, and a labeled deny probe. Live API errors are not gate misses.
                  </p>
                  {run.eval.missed.length ? (
                    <p className="text-amber-700">
                      Missed: {run.eval.missed.map((m) => `${m.lane} (wanted ${m.expected}, got ${m.actual})`).join("; ")}
                    </p>
                  ) : (
                    <p className="text-emerald-700">All trust gates matched this run.</p>
                  )}
                  {pending ? (
                    <Link href="/approvals" className="btn-quiet mt-1 inline-flex">
                      Review holds
                    </Link>
                  ) : null}
                </div>
              </Panel>
            </div>
          </div>
        ) : (
          <Panel>
            <div className="px-4 py-14 text-center">
              <p className="text-[14px] tracking-tight text-[#333]">No run yet</p>
              <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-[#737373]">
                Dry-run weekly ops or start Support Copilot. Every step hits Aegis before Gmail, Slack, Notion, or GitHub — and before the model sees the result.
              </p>
            </div>
          </Panel>
        )}
      </ProductBody>
    </div>
  );
}
