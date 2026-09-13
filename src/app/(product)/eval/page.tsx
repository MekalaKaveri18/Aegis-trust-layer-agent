"use client";

import { PageHeader, Panel, PanelTitle, ProductBody } from "@/components/page-header";
import { useEffect, useState } from "react";
import Link from "next/link";

type GateRow = {
  id: string;
  title: string;
  expected: string;
  actual: string;
  ok: boolean;
  reasons: string[];
};

type Payload = {
  gates: { matched: number; total: number; results: GateRow[] };
  minimize: { matched: number; total: number; results: GateRow[] };
  lastAgentRun: {
    id: string;
    status: string;
    eval: { matched: number; total: number; missed: Array<{ lane: string; expected: string; actual: string }> };
    githubNote: string;
    note: string;
  } | null;
};

export default function EvalPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/eval", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load eval");
        return res.json() as Promise<Payload>;
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  return (
    <div>
      <PageHeader
        title="Reliability brief"
        description="Policy battery plus a minimization battery: PII and secrets must never appear in the model-facing payload."
        actions={
          <Link href="/agent" className="btn-primary">
            Run the agent
          </Link>
        }
      />
      <ProductBody className="space-y-5">
        {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
        {!data ? (
          <p className="text-[13px] text-[#737373]">Loading battery…</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Panel>
                <PanelTitle>Policy battery</PanelTitle>
                <p className="px-4 py-4 font-mono text-[22px] text-[#0c0c0c]">
                  {data.gates.matched}/{data.gates.total}
                </p>
              </Panel>
              <Panel>
                <PanelTitle>Minimization</PanelTitle>
                <p className="px-4 py-4 font-mono text-[22px] text-[#0c0c0c]">
                  {data.minimize.matched}/{data.minimize.total}
                </p>
              </Panel>
              <Panel>
                <PanelTitle>Last agent run</PanelTitle>
                <div className="px-4 py-4 text-[13px] text-[#333]">
                  {data.lastAgentRun ? (
                    <>
                      <p className="font-mono text-[22px] text-[#0c0c0c]">
                        {data.lastAgentRun.eval.matched}/{data.lastAgentRun.eval.total}
                      </p>
                      <p className="mt-2 text-[#737373]">{data.lastAgentRun.note}</p>
                    </>
                  ) : (
                    <p>No agent run yet.</p>
                  )}
                </div>
              </Panel>
            </div>
            <Panel>
              <PanelTitle>Cases</PanelTitle>
              <table className="w-full text-left text-[13px]">
                <thead className="text-[11px] text-[#8a8a8a]">
                  <tr className="border-b border-[#e0e0e0]">
                    <th className="px-4 py-2.5 font-medium">Case</th>
                    <th className="px-4 py-2.5 font-medium">Expected</th>
                    <th className="px-4 py-2.5 font-medium">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.gates.results, ...data.minimize.results].map((row) => (
                    <tr key={row.id} className="border-b border-[#ececec] last:border-0">
                      <td className="px-4 py-3">
                        <p>{row.title}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-[#8a8a8a]">{row.id}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#737373]">{row.expected}</td>
                      <td className={`px-4 py-3 font-mono text-[11px] ${row.ok ? "text-emerald-700" : "text-red-600"}`}>
                        {row.actual} {row.ok ? "· pass" : "· fail"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
            <p className="text-[12px] leading-relaxed text-[#8a8a8a]">
              Run the same battery locally with <code className="text-[#5f5f5f]">npm test</code>. Agents never call tools
              directly. Sensitive values are redacted before they reach the model, then denied again if the call itself is
              forbidden.
            </p>
          </>
        )}
      </ProductBody>
    </div>
  );
}
