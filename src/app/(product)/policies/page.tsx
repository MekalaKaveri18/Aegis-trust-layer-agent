"use client";

import { DecisionBadge } from "@/components/badges";
import { PageHeader, Panel, ProductBody } from "@/components/page-header";
import { useAegis } from "@/components/state-provider";
import { patchPolicy } from "@/lib/client";
import { decisionLabel } from "@/lib/format";
import type { VerdictDecision } from "@/lib/trust/types";
import { toast } from "sonner";

const DECISIONS: VerdictDecision[] = ["allow", "require_approval", "deny"];

export default function PoliciesPage() {
  const { state, setState } = useAegis();

  async function apply(id: string, patch: { enabled?: boolean; decision?: VerdictDecision }) {
    try {
      const next = await patchPolicy(id, patch);
      setState(next);
      toast.success("Policy updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Policy update failed");
    }
  }

  const policies = state.policies.slice().sort((a, b) => b.priority - a.priority);

  return (
    <div>
      <PageHeader
        title="Policies"
        description="Highest priority first. Minimization rules decide what the model may see. Agents cannot rewrite this pack."
      />
      <ProductBody>
      <Panel>
        <ul>
          {policies.map((policy) => (
            <li
              key={policy.id}
              className="flex flex-col gap-3 border-b border-[#ececec] px-4 py-4 last:border-0 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-medium">{policy.name}</p>
                  <DecisionBadge decision={policy.decision} />
                </div>
                <p className="mt-1 text-[12px] text-[#737373]">{policy.description}</p>
                {policy.minimize ? (
                  <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-[#8a8a8a] uppercase">
                    Minimize · {policy.minimize}
                    {policy.condition.dataClasses?.length
                      ? ` · ${policy.condition.dataClasses.join(" ")}`
                      : ""}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <select
                  aria-label={`${policy.name} decision`}
                  className="field h-7 w-auto px-2 text-[12px]"
                  value={policy.decision}
                  onChange={(e) => void apply(policy.id, { decision: e.target.value as VerdictDecision })}
                >
                  {DECISIONS.map((d) => (
                    <option key={d} value={d}>
                      {decisionLabel(d)}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-[12px] text-[#737373]">
                  <input
                    type="checkbox"
                    className="size-3.5 accent-white"
                    checked={policy.enabled}
                    onChange={(e) => void apply(policy.id, { enabled: e.target.checked })}
                  />
                  {policy.enabled ? "On" : "Off"}
                </label>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
      </ProductBody>
    </div>
  );
}
