import { AppLogo } from "./brand-logos";

export function ProductPreview() {
  return (
    <div className="overflow-hidden border border-dashed border-[#c5c5c5] bg-white text-[#0c0c0c]">
      <div className="flex items-center gap-1.5 border-b border-[#d9d9d9] px-3 py-2">
        <span className="size-2 rounded-full bg-[#d9d9d9]" />
        <span className="size-2 rounded-full bg-[#d9d9d9]" />
        <span className="size-2 rounded-full bg-[#d9d9d9]" />
        <span className="ml-2 font-mono text-[10px] tracking-wide text-[#737373]">aegis.app/approvals</span>
      </div>
      <div className="grid md:grid-cols-[168px_1fr]">
        <aside className="hidden border-r border-[#d9d9d9] p-3 md:block">
          <div className="mb-3 flex items-center gap-2 px-1">
            <span className="flex size-5 items-center justify-center rounded-md bg-[#c9ff4a] text-[10px] font-semibold">A</span>
            <span className="text-[13px] font-medium tracking-tight">Aegis</span>
          </div>
          {["Overview", "Agent", "Approvals", "Audit", "Policies"].map((item, i) => (
            <div
              key={item}
              className={`px-2 py-[6px] text-[12px] ${i === 2 ? "rounded-full border border-dashed border-[#bdbdbd] bg-black/[0.04]" : "text-[#737373]"}`}
            >
              {item}
            </div>
          ))}
        </aside>
        <div>
          <div className="flex items-end justify-between border-b border-[#d9d9d9] px-4 py-3">
            <div>
              <p className="font-mono text-[10px] tracking-[0.08em] text-[#737373] uppercase">Hold queue</p>
              <p className="mt-0.5 text-[15px] font-medium tracking-tight">Approvals</p>
            </div>
            <span className="bg-[#c9ff4a] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#0c0c0c]">2 HOLD</span>
          </div>
          <div>
            {[
              { app: "gmail", action: "Inbox thread with SSN + email", mark: "MINIMIZE" },
              { app: "github", action: "Merge PR #512 on acme/billing-api", mark: "HOLD" },
              { app: "slack", action: "Post to #support", mark: "ALLOW" },
              { app: "gmail", action: "Outbound with API key", mark: "DENY" },
            ].map((row, i) => (
              <div
                key={row.action}
                className={`relative flex items-center justify-between gap-3 border-b border-[#eee] px-4 py-2.5 last:border-0 ${i === 0 ? "bg-[#f7f7f5]" : ""}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] tracking-tight">{row.action}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] tracking-wide text-[#8a8a8a] uppercase">
                    <AppLogo app={row.app} className="size-3.5" />
                    {row.app}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] font-medium tracking-[0.08em]">{row.mark}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
