import { cn } from "@/lib/utils";
import type { RiskLevel, VerdictDecision } from "@/lib/trust/types";

const TONE = {
  healthy: "bg-emerald-600",
  hold: "bg-amber-500",
  blocked: "bg-red-600",
  idle: "bg-black/20",
} as const;

export function StatusDot({
  tone,
  pulse,
}: {
  tone: keyof typeof TONE;
  pulse?: boolean;
}) {
  return (
    <span className="relative inline-flex size-1.5 shrink-0">
      {pulse ? (
        <span className={cn("absolute inset-0 animate-ping rounded-full opacity-40", TONE[tone])} />
      ) : null}
      <span className={cn("relative size-1.5 rounded-full", TONE[tone])} />
    </span>
  );
}

/** Control-plane verdict — Witness / Aegis Protect style: word + dot, not a filled chip. */
export function VerdictMark({ decision }: { decision: VerdictDecision | string }) {
  const key = decision.replace("require_approval", "hold");
  const map: Record<string, { label: string; tone: keyof typeof TONE; text: string }> = {
    allow: { label: "ALLOW", tone: "healthy", text: "text-emerald-700" },
    allowed: { label: "ALLOW", tone: "healthy", text: "text-emerald-700" },
    executed: { label: "EXECUTED", tone: "healthy", text: "text-emerald-700" },
    approved: { label: "EXECUTED", tone: "healthy", text: "text-emerald-700" },
    hold: { label: "HOLD", tone: "hold", text: "text-amber-700" },
    pending: { label: "HOLD", tone: "hold", text: "text-amber-700" },
    held: { label: "HOLD", tone: "hold", text: "text-amber-700" },
    require_approval: { label: "HOLD", tone: "hold", text: "text-amber-700" },
    deny: { label: "DENY", tone: "blocked", text: "text-red-600" },
    denied: { label: "DENY", tone: "blocked", text: "text-red-600" },
    rejected: { label: "BLOCKED", tone: "blocked", text: "text-red-600" },
    previewed: { label: "DRY RUN", tone: "idle", text: "text-[#5f5f5f]" },
  };
  const v = map[key] ?? map[decision] ?? { label: String(decision).toUpperCase(), tone: "idle" as const, text: "text-[#737373]" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-[0.08em]", v.text)}>
      <StatusDot tone={v.tone} pulse={v.tone === "hold"} />
      {v.label}
    </span>
  );
}

export function RiskMark({ level }: { level: RiskLevel }) {
  const map: Record<RiskLevel, { label: string; tone: keyof typeof TONE; text: string }> = {
    low: { label: "LOW", tone: "healthy", text: "text-emerald-700" },
    medium: { label: "MED", tone: "hold", text: "text-amber-700" },
    high: { label: "HIGH", tone: "hold", text: "text-amber-800" },
    critical: { label: "CRIT", tone: "blocked", text: "text-red-600" },
  };
  const v = map[level];
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em]", v.text)}>
      <StatusDot tone={v.tone} />
      {v.label}
    </span>
  );
}

export function ConnectorMark({ healthy, label }: { healthy: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.06em] text-[#737373]">
      <StatusDot tone={healthy ? "healthy" : "idle"} pulse={healthy} />
      {label ?? (healthy ? "HEALTHY" : "UNBOUND")}
    </span>
  );
}

export function FanoutMark({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em]",
        ok ? "text-emerald-700" : "text-red-600"
      )}
    >
      <StatusDot tone={ok ? "healthy" : "blocked"} />
      {ok ? "OK" : "FAIL"}
    </span>
  );
}

export function TrustPosture({
  enforcing,
  connectors,
  holds,
}: {
  enforcing: boolean;
  connectors: string;
  holds: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#737373]">
      <span className="inline-flex items-center gap-1.5 font-mono tracking-[0.08em] text-[#333]">
        <StatusDot tone={enforcing ? "healthy" : "hold"} pulse={enforcing} />
        {enforcing ? "ENFORCING" : "DEGRADED"}
      </span>
      <span>{connectors}</span>
      {holds > 0 ? (
        <span className="inline-flex items-center gap-1.5 text-amber-700">
          <StatusDot tone="hold" pulse />
          {holds} HOLD
        </span>
      ) : (
        <span>inbox clear</span>
      )}
    </div>
  );
}
