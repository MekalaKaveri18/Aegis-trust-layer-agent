import { AppLogo } from "./brand-logos";
import { RiskMark, VerdictMark } from "./status";
import type { RiskLevel, VerdictDecision } from "@/lib/trust/types";

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <RiskMark level={level} />;
}

export function DecisionBadge({ decision }: { decision: VerdictDecision | string }) {
  return <VerdictMark decision={decision} />;
}

export function AppPill({ app }: { app: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.06em] text-[#737373] uppercase">
      <AppLogo app={app} className="size-3.5" />
      {app}
    </span>
  );
}
