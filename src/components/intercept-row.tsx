"use client";

import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import type { InterceptRecord } from "@/lib/trust/types";
import { AppPill, DecisionBadge } from "./badges";
import { useAegis } from "./state-provider";
import Link from "next/link";

export function InterceptRow({
  record,
  selected,
  href,
}: {
  record: InterceptRecord;
  selected?: boolean;
  href?: string;
}) {
  const { state } = useAegis();
  const agent = state.agents.find((a) => a.id === record.agentId)?.name ?? record.agentId;
  const inner = (
    <>
      <span
        className={cn(
          "absolute top-2 bottom-2 left-0 w-[2px] rounded-full transition-colors",
          selected ? "bg-[#0c0c0c]" : "bg-transparent"
        )}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[13px] tracking-tight", selected ? "text-[#0c0c0c]" : "text-[#0c0c0c]")}>
          {record.summary}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-[#8a8a8a]">
          {agent}
          <span className="mx-1.5 text-[#cfcfcf]">·</span>
          {record.action}
          <span className="mx-1.5 text-[#cfcfcf]">·</span>
          {formatTime(record.createdAt)}
        </p>
      </div>
      <AppPill app={record.app} />
      <DecisionBadge decision={record.status} />
    </>
  );
  const cls = cn(
    "relative flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors duration-150",
    selected ? "bg-[#f7f7f5]" : "hover:bg-[#fafafa]"
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}
