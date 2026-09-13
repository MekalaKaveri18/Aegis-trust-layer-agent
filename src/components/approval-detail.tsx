"use client";

import { resolveApproval } from "@/lib/client";
import { formatTime } from "@/lib/format";
import type { InterceptRecord } from "@/lib/trust/types";
import { Pipeline } from "./pipeline";
import { MinimizeDiff } from "./minimize-diff";
import { FanOut } from "./fan-out";
import { PayloadView } from "./payload-view";
import { useAegis } from "./state-provider";
import { AppPill, DecisionBadge, RiskBadge } from "./badges";
import { toast } from "sonner";
import { useState } from "react";

export function ApprovalDetail({ record }: { record: InterceptRecord }) {
  const { state, setState } = useAegis();
  const [busy, setBusy] = useState(false);
  const agent = state.agents.find((a) => a.id === record.agentId);
  const pending = record.status === "pending";

  async function act(decision: "approve" | "reject") {
    setBusy(true);
    try {
      const result = await resolveApproval(record.id, decision);
      setState(result.state);
      toast.success(decision === "approve" ? "Approved — executing against the live API" : "Rejected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resolve");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <AppPill app={record.app} />
          <RiskBadge level={record.verdict.riskLevel} />
          <DecisionBadge decision={record.status} />
          <span className="text-[12px] text-[#8a8a8a]">{formatTime(record.createdAt)}</span>
        </div>
        <h2 className="mt-3 text-[17px] font-medium tracking-tight text-[#0c0c0c]">{record.summary}</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#737373]">
          {agent?.name ?? record.agentId}
          <span className="mx-1.5 text-[#c0c0c0]">·</span>
          {record.action}
          {record.verdict.reasons[0] ? (
            <>
              <span className="mx-1.5 text-[#c0c0c0]">·</span>
              {record.verdict.reasons[0]}
            </>
          ) : null}
        </p>

        {record.verdict.reasons.length > 1 ? (
          <ul className="mt-3 space-y-1">
            {record.verdict.reasons.slice(1).map((reason) => (
              <li key={reason} className="text-[12px] text-[#8a8a8a]">
                {reason}
              </li>
            ))}
          </ul>
        ) : null}

        <section className="mt-7">
          <p className="kicker mb-3">Trust pipeline</p>
          <Pipeline steps={record.verdict.steps} />
        </section>

        {record.verdict.minimization ? (
          <section className="mt-7">
            <p className="kicker mb-3">What the model sees</p>
            <MinimizeDiff result={record.verdict.minimization} />
          </section>
        ) : null}

        <section className="mt-7">
          <p className="kicker mb-3">Fan-out</p>
          {(record.events ?? []).length ? (
            <FanOut events={record.events ?? []} />
          ) : (
            <p className="text-[13px] text-[#8a8a8a]">No connector calls yet. Allow to hit the live API.</p>
          )}
        </section>

        <section className="mt-7 pb-8">
          <p className="kicker mb-3">Payload</p>
          <PayloadView payload={record.payload} />
        </section>
      </div>

      {pending ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#e8e8e8] bg-white px-5 py-2.5">
          <p className="hidden min-w-0 truncate text-[12px] text-[#8a8a8a] sm:block">Held until you attest.</p>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="btn-danger min-w-[76px]" disabled={busy} onClick={() => void act("reject")}>
              {busy ? "…" : "Block"}
            </button>
            <button type="button" className="btn-primary min-w-[88px]" disabled={busy} onClick={() => void act("approve")}>
              {busy ? "…" : "Allow"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
