"use client";

import { resolveApproval } from "@/lib/client";
import { formatTime } from "@/lib/format";
import type { InterceptRecord } from "@/lib/trust/types";
import { useAegis } from "./state-provider";
import { AppPill, DecisionBadge, RiskBadge } from "./badges";
import { toast } from "sonner";
import { useState } from "react";

export function ApprovalCard({ record }: { record: InterceptRecord }) {
  const { setState } = useAegis();
  const [busy, setBusy] = useState(false);

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
    <li className="flex flex-col gap-3 border-t border-[#ececec] px-4 py-4 first:border-t-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <AppPill app={record.app} />
          <RiskBadge level={record.verdict.riskLevel} />
          <DecisionBadge decision={record.status} />
          <span className="text-[12px] text-[#8a8a8a]">{formatTime(record.createdAt)}</span>
        </div>
        <p className="mt-2 text-[13px] leading-snug tracking-tight">{record.summary}</p>
        <p className="mt-1 text-[12px] text-[#737373]">{record.verdict.reasons[0]}</p>
      </div>
      {record.status === "pending" ? (
        <div className="flex shrink-0 gap-2">
            <button type="button" className="btn-primary min-w-[88px]" disabled={busy} onClick={() => void act("approve")}>
              {busy ? "…" : "Allow"}
            </button>
            <button type="button" className="btn-danger min-w-[76px]" disabled={busy} onClick={() => void act("reject")}>
              {busy ? "…" : "Block"}
            </button>
        </div>
      ) : null}
    </li>
  );
}
