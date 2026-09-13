"use client";

import { playControlStory, simulate } from "@/lib/client";
import { FanOut } from "./fan-out";
import { InterceptRow } from "./intercept-row";
import { ConnectorMark, TrustPosture, VerdictMark } from "./status";
import { useAegis } from "./state-provider";
import Link from "next/link";
import { AppLogo } from "./brand-logos";
import type { InterceptRecord } from "@/lib/trust/types";
import { CONTROL_STORY } from "@/lib/trust/scenarios";
import { toast } from "sonner";
import { useState } from "react";

const LIVE = [
  { id: "gmail-read", app: "gmail" as const, label: "Read Gmail" },
  { id: "slack-support", app: "slack" as const, label: "Post Slack" },
  { id: "notion-runbook", app: "notion" as const, label: "Write Notion" },
  { id: "github-merge", app: "github" as const, label: "Hold GitHub merge" },
];

export function CommandCenter({ firstName }: { firstName: string }) {
  const { state, setState } = useAegis();
  const [busy, setBusy] = useState<string | null>(null);
  const [story, setStory] = useState<Array<{ id: string; title: string; record: InterceptRecord }> | null>(null);
  const pending = state.stats.pending;
  const connected = state.apps.filter((a) => a.status === "connected");

  async function run(id: string) {
    setBusy(id);
    try {
      const result = await simulate(id);
      setState(result.state);
      const d = result.record.verdict.decision;
      toast.message(
        d === "allow"
          ? "ALLOW — executing against the live API"
          : d === "require_approval"
            ? "HOLD — queued for attestation"
            : "DENY — blocked by policy"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not run");
    } finally {
      setBusy(null);
    }
  }

  async function playStory() {
    setBusy("story");
    try {
      const result = await playControlStory();
      setState(result.state);
      setStory(result.beats.map((b) => ({ id: b.id, title: b.title, record: b.record })));
      toast.success("ALLOW (minimized) → ALLOW → DENY secret → HOLD merge.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Story failed");
    } finally {
      setBusy(null);
    }
  }

  const held = story?.find((b) => b.record.status === "pending");

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[#ececec] px-6 py-4">
        <div>
            <p className="kicker">Trust layer</p>
          <h1 className="mt-1 text-[17px] font-medium tracking-tight">Overview</h1>
          <div className="mt-2">
            <TrustPosture
              enforcing={connected.length === 4}
              connectors={`${connected.length}/4 MCP tools bound`}
              holds={pending}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="hidden text-[11px] text-[#8a8a8a] sm:block">{firstName}</p>
          <Link href="/agent" className="btn-primary">
            Weekly ops
          </Link>
          <button type="button" disabled={busy !== null} onClick={() => void playStory()} className="btn-quiet">
            {busy === "story" ? "Enforcing story…" : "Run control demo"}
          </button>
          {pending > 0 ? (
            <Link href="/approvals" className="btn-quiet">
              Review holds
            </Link>
          ) : null}
        </div>
      </header>

      <div className="border-b border-[#ececec] px-6 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {state.apps.map((app) => {
            const on = app.status === "connected";
            return (
              <Link key={app.id} href={on ? "/apps" : `/connect/${app.id}`} className="inline-flex items-center gap-2 text-[12px] text-[#444] transition-colors hover:text-[#0c0c0c]">
                <AppLogo app={app.id} className="size-4" />
                <span>{app.name}</span>
                <ConnectorMark healthy={on} />
              </Link>
            );
          })}
        </div>
        <div className="seg mt-3">
          {LIVE.map((item) => {
            const on = connected.some((a) => a.id === item.app);
            return (
              <button
                key={item.id}
                type="button"
                disabled={!on || busy !== null}
                onClick={() => void run(item.id)}
                data-active={busy === item.id}
                className="inline-flex items-center gap-1.5"
              >
                <AppLogo app={item.app} className="size-3.5" />
                {busy === item.id ? "…" : item.label}
              </button>
            );
          })}
        </div>
      </div>

      {story ? (
        <ol className="grid gap-px border-b border-[#ececec] bg-black/[0.04] sm:grid-cols-4">
          {story.map((beat, i) => (
            <li key={beat.id} className="bg-white px-5 py-3.5">
              <p className="font-mono text-[10px] tracking-[0.12em] text-[#8a8a8a]">
                {String(i + 1).padStart(2, "0")} · {CONTROL_STORY[i]?.title}
              </p>
              <div className="mt-1.5">
                <VerdictMark decision={beat.record.verdict.decision} />
              </div>
              {beat.record.status === "pending" ? (
                <Link href={`/approvals?id=${beat.record.id}`} className="mt-2 inline-flex text-[12px] text-[#737373] underline-offset-2 hover:text-[#0c0c0c] hover:underline">
                  Open hold
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="border-b border-[#ececec] px-6 py-2.5 text-[12px] text-[#8a8a8a]">
          Control demo: ALLOW a minimized Gmail read → ALLOW Slack → DENY a secret send → HOLD a GitHub merge.
          {held ? (
            <>
              {" "}
              <Link href={`/approvals?id=${held.record.id}`} className="text-[#333] hover:text-[#0c0c0c]">
                Open hold
              </Link>
            </>
          ) : null}
        </p>
      )}

      <div className="grid grid-cols-2 border-b border-[#ececec] text-[12px] sm:grid-cols-4">
        <Stat label="Intercepted" value={state.stats.intercepted} />
        <Stat label="Executed" value={state.stats.executed} />
        <Stat label="Held" value={state.stats.pending} />
        <Stat label="Blocked" value={state.stats.denied} />
      </div>
      <div className="grid grid-cols-2 border-b border-[#ececec] text-[12px] sm:grid-cols-4">
        <Stat label="Success rate" value={state.reliability?.successRate ?? 0} suffix="%" />
        <Stat label="Redacted" value={state.reliability?.redacted ?? 0} />
        <Stat label="Violations" value={state.reliability?.policyViolations ?? 0} />
        <Stat label="Avg latency" value={state.reliability?.avgLatencyMs ?? 0} suffix="ms" />
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_300px]">
        <section className="min-w-0">
          <p className="kicker px-6 py-2.5">Activity</p>
          {state.intercepts.length === 0 ? (
            <p className="px-6 py-10 text-[13px] text-[#8a8a8a]">
              Nothing intercepted yet. Run the control demo — Aegis will minimize tool results before they reach the model.
            </p>
          ) : (
            <ul className="divide-y divide-[#eee]">
              {state.intercepts.slice(0, 14).map((row) => (
                <li key={row.id}>
                  <InterceptRow
                    record={row}
                    href={row.status === "pending" ? `/approvals?id=${row.id}` : undefined}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className="border-t border-[#ececec] lg:border-l lg:border-t-0">
          <p className="kicker px-4 py-2.5">Fan-out</p>
          <div className="px-3 pb-4">
            {state.integrationEvents.length === 0 ? (
              <p className="px-1 py-4 text-[12px] leading-relaxed text-[#8a8a8a]">
                Each intercept can minimize for the model, then fan out to Slack, Notion, and the target app.
              </p>
            ) : (
              <FanOut events={state.integrationEvents.slice(0, 10)} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="px-6 py-3.5">
      <p className="text-[11px] text-[#8a8a8a]">{label}</p>
      <p className="mt-1 text-[20px] font-medium tabular-nums tracking-tight">
        {value}
        {suffix ? <span className="ml-0.5 text-[12px] font-normal text-[#8a8a8a]">{suffix}</span> : null}
      </p>
    </div>
  );
}
