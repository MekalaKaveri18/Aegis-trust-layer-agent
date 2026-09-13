import type { MinimizationResult } from "@/lib/trust/types";

export function MinimizeDiff({ result }: { result: MinimizationResult }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <p className="font-mono text-[10px] tracking-[0.08em] text-[#8a8a8a] uppercase">Raw tool output</p>
        <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-dashed border-[#e0e0e0] bg-[#fafafa] px-3 py-2 font-mono text-[11px] leading-relaxed text-[#737373]">
          {result.raw || "—"}
        </pre>
      </div>
      <div>
        <p className="font-mono text-[10px] tracking-[0.08em] text-[#8a8a8a] uppercase">What the model sees</p>
        <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-dashed border-[#c9ff4a] bg-[#fcfff3] px-3 py-2 font-mono text-[11px] leading-relaxed text-[#0c0c0c]">
          {result.forModel || "—"}
        </pre>
      </div>
      {result.findings.length ? (
        <p className="font-mono text-[11px] text-[#737373] sm:col-span-2">
          {result.redactedCount} value{result.redactedCount === 1 ? "" : "s"} minimized
          {result.findings.length
            ? ` · ${result.findings.map((f) => `${f.label} ${f.action}`).join(" · ")}`
            : ""}
        </p>
      ) : null}
    </div>
  );
}
