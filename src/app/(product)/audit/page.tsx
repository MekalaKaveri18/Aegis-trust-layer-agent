"use client";

import { AppPill, DecisionBadge } from "@/components/badges";
import { PageHeader, Panel, ProductBody } from "@/components/page-header";
import { useAegis } from "@/components/state-provider";
import { formatTime } from "@/lib/format";

export default function AuditPage() {
  const { state } = useAegis();

  const broken = state.audit.some((entry, i, arr) => {
    if (i === arr.length - 1) return false;
    return entry.prevHash !== arr[i + 1].hash;
  });

  return (
    <div>
      <PageHeader
        title="Audit"
        description="Every intercept, minimization, and verdict is hashed with the previous entry."
        actions={
          <span className={`text-[13px] ${broken ? "text-red-600" : "text-[#737373]"}`}>
            Chain {broken ? "broken" : "intact"}
          </span>
        }
      />
      <ProductBody>

      {state.audit.length === 0 ? (
        <p className="text-[13px] text-[#737373]">No events yet.</p>
      ) : (
        <Panel>
          <table className="w-full text-left text-[13px]">
            <thead className="text-[11px] text-[#8a8a8a]">
              <tr className="border-b border-[#e0e0e0]">
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Event</th>
                <th className="px-4 py-2.5 font-medium">App</th>
                <th className="px-4 py-2.5 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {state.audit.map((row) => (
                <tr key={row.id} className="border-b border-[#ececec] last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-[#737373]">{formatTime(row.at)}</td>
                  <td className="px-4 py-3">
                    <DecisionBadge decision={row.event} />
                  </td>
                  <td className="px-4 py-3">
                    <AppPill app={row.app} />
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <p className="truncate">{row.summary}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-[#a3a3a3]" title={row.hash}>
                      {row.hash.slice(0, 10)}…
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
      </ProductBody>
    </div>
  );
}
