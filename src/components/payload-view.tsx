import type { ActionPayload } from "@/lib/trust/types";

const LABELS: Record<string, string> = {
  to: "To",
  subject: "Subject",
  body: "Body",
  channel: "Channel",
  database: "Database",
  page: "Page",
  content: "Content",
  repo: "Repository",
  prNumber: "Pull request",
  prTitle: "PR title",
};

export function PayloadView({ payload }: { payload: ActionPayload }) {
  const rows = Object.entries(payload).filter(([, v]) => {
    if (v == null || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });

  if (!rows.length) {
    return <p className="text-[13px] text-[#8a8a8a]">No payload fields on this intercept.</p>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-[#e8e8e8] bg-white">
      <dl>
        {rows.map(([key, value], i) => (
          <div
            key={key}
            className={`grid gap-1 px-3.5 py-2.5 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-4 ${
              i ? "border-t border-[#eee]" : ""
            }`}
          >
            <dt className="pt-0.5 font-mono text-[10px] tracking-[0.08em] text-[#8a8a8a] uppercase">
              {LABELS[key] ?? key}
            </dt>
            <dd className="min-w-0 text-[13px] leading-relaxed text-[#111] break-words whitespace-pre-wrap">
              {Array.isArray(value) ? value.join(", ") : String(value)}
            </dd>
          </div>
        ))}
      </dl>
      <details className="border-t border-[#eee]">
        <summary className="cursor-pointer px-3.5 py-2 text-[11px] text-[#8a8a8a] transition-colors hover:text-[#5f5f5f]">
          Raw JSON
        </summary>
        <pre className="overflow-x-auto px-3.5 pb-3 font-mono text-[11px] leading-relaxed text-[#737373]">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </details>
    </div>
  );
}
