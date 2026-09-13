"use client";

import { ApprovalDetail } from "@/components/approval-detail";
import { InterceptRow } from "@/components/intercept-row";
import { useAegis } from "@/components/state-provider";
import { ResizableGroup, ResizableHandle, ResizablePanel } from "@/components/ui/resizable";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

function ApprovalsInner() {
  const { state } = useAegis();
  const params = useSearchParams();
  const items = useMemo(() => {
    const pending = state.pending;
    const rest = state.intercepts.filter((i) => i.status !== "pending");
    return [...pending, ...rest];
  }, [state.pending, state.intercepts]);
  const selectedId = params.get("id") || items[0]?.id;
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const holds = state.pending.length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-end justify-between gap-3 border-b border-[#ececec] px-5 py-3.5">
        <div>
          <p className="kicker">Hold queue</p>
          <h1 className="mt-1 text-[17px] font-medium tracking-tight">Approvals</h1>
        </div>
        <p className="font-mono text-[11px] tracking-[0.08em] text-[#8a8a8a]">
          {holds === 0 ? "INBOX CLEAR" : `${holds} HOLD`}
        </p>
      </header>
      <div className="min-h-0 flex-1">
        <ResizableGroup id="aegis-approvals" panelIds={["list", "detail"]}>
          <ResizablePanel id="list" defaultSize="36%" minSize="240px" className="min-h-0">
            <div className="h-full overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <p className="text-[14px] tracking-tight text-[#333]">Nothing waiting.</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#8a8a8a]">
                    Inbox is empty.{" "}
                    <Link href="/command" className="text-[#444] underline-offset-2 hover:text-[#0c0c0c] hover:underline">
                      Run a live action
                    </Link>{" "}
                    or{" "}
                    <Link href="/playground" className="text-[#444] underline-offset-2 hover:text-[#0c0c0c] hover:underline">
                      simulate a hold
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[#eee] py-1">
                  {items.map((r) => (
                    <li key={r.id}>
                      <InterceptRow record={r} selected={r.id === selected?.id} href={`/approvals?id=${r.id}`} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel id="detail" minSize="40%" className="min-h-0">
            <div className="h-full min-h-0 overflow-hidden">
              {selected ? (
                <ApprovalDetail record={selected} />
              ) : (
                <p className="px-6 py-16 text-center text-[13px] text-[#8a8a8a]">Select an intercept.</p>
              )}
            </div>
          </ResizablePanel>
        </ResizableGroup>
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense fallback={<p className="px-6 py-8 text-[13px] text-[#8a8a8a]">Loading inbox…</p>}>
      <ApprovalsInner />
    </Suspense>
  );
}
