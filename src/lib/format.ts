import type { AppId, RiskLevel, VerdictDecision } from "./trust/types";

const DISPLAY_TZ = "America/Los_Angeles";
const OPEN_HOUR = 10;
const OPEN_MINUTE = 12;

function tzParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function pacificWallToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0
) {
  const desired = hour * 3600 + minute * 60 + second;
  let utc = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 3; i++) {
    const shown = tzParts(new Date(utc));
    const got = shown.hour * 3600 + shown.minute * 60 + shown.second;
    utc += (desired - got) * 1000;
  }
  return utc;
}

/** Instant for 10:12 AM Pacific on the same calendar day as `ms`. */
export function pacificOpenMs(ms: number) {
  const p = tzParts(new Date(ms));
  return pacificWallToUtc(p.year, p.month, p.day, OPEN_HOUR, OPEN_MINUTE, 0);
}

export function notBeforeOpen(iso: string): string {
  const ms = new Date(iso).getTime();
  const open = pacificOpenMs(Number.isFinite(ms) ? ms : Date.now());
  if (!Number.isFinite(ms)) return new Date(open).toISOString();
  return new Date(Math.max(ms, open)).toISOString();
}

function pacificMinuteKey(ms: number) {
  const p = tzParts(new Date(ms));
  return `${p.year}-${p.month}-${p.day}-${p.hour}-${p.minute}`;
}

/** At most this many timestamps may share the same displayed Pacific minute. */
export const MAX_TIMESTAMPS_PER_MINUTE = 5;

/**
 * Keep every time at or after 10:12 AM Pacific, and spread collisions so a
 * minute never shows more than {@link MAX_TIMESTAMPS_PER_MINUTE} events.
 */
export function spreadAfterOpen(isos: string[]): string[] {
  if (!isos.length) return [];
  const indexed = isos.map((iso, i) => {
    const raw = new Date(iso).getTime();
    const open = pacificOpenMs(Number.isFinite(raw) ? raw : Date.now());
    const ms = Number.isFinite(raw) ? Math.max(raw, open) : open;
    return { i, ms };
  });
  indexed.sort((a, b) => a.ms - b.ms || a.i - b.i);

  const counts = new Map<string, number>();
  const assigned = new Array<number>(isos.length);
  for (const row of indexed) {
    let t = row.ms;
    let key = pacificMinuteKey(t);
    while ((counts.get(key) ?? 0) >= MAX_TIMESTAMPS_PER_MINUTE) {
      t += 60_000;
      key = pacificMinuteKey(t);
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
    assigned[row.i] = t;
  }
  return assigned.map((t) => new Date(t).toISOString());
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    timeZone: DISPLAY_TZ,
  }).format(new Date(notBeforeOpen(iso)));
}

/** Pacific wall clock is before the 10:12 AM open. */
export function isBeforePacificOpen(date = new Date()) {
  const p = tzParts(date);
  return p.hour < OPEN_HOUR || (p.hour === OPEN_HOUR && p.minute < OPEN_MINUTE);
}

export function appLabel(app: AppId) {
  return { gmail: "Gmail", slack: "Slack", notion: "Notion", github: "GitHub" }[app];
}

export function decisionLabel(d: VerdictDecision) {
  return { allow: "Allow", require_approval: "Hold for approval", deny: "Deny" }[d];
}

export function riskTone(level: RiskLevel) {
  return {
    low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    medium: "text-amber-300 bg-amber-400/10 border-amber-400/20",
    high: "text-orange-300 bg-orange-400/10 border-orange-400/25",
    critical: "text-red-300 bg-red-500/15 border-red-500/25",
  }[level];
}
