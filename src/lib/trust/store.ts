import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dataDir, dataFile } from "../data-dir";
import { evaluate } from "./engine";
import { agents, connectedApps, policies, seedHistory } from "./seed";
import type {
  AuditEntry,
  IntegrationEvent,
  InterceptRecord,
  Policy,
  ProposedAction,
  PublicState,
  StoreState,
  VerdictDecision,
} from "./types";
import { executeDecision } from "../integrations";
import { connectionSummaries } from "../oauth/connections";
import { notBeforeOpen, spreadAfterOpen } from "../format";
import { actionPreview } from "./injection";

const DATA_DIR = dataDir();
const FILE = dataFile("store.json");

let writeQueue: Promise<void> = Promise.resolve();

function genesis(): StoreState {
  const now = Date.now();
  const iso = new Date(now).toISOString();
  const history = seedHistory(now);
  return {
    agents,
    policies: structuredClone(policies),
    intercepts: history.intercepts,
    approvals: history.intercepts.filter((i) => i.status === "pending"),
    audit: history.audit,
    integrationEvents: [
      {
        id: "ie-1",
        app: "slack",
        at: history.intercepts[3].createdAt,
        kind: "approval_request",
        summary: "Posted approval card to #aegis-approvals",
        detail: "Outreach Bot wants to send Gmail to 24 external leads.",
        ok: true,
      },
      {
        id: "ie-2",
        app: "notion",
        at: history.audit[3].at,
        kind: "audit_append",
        summary: "Appended held send to Audit Logs",
        detail: history.audit[3].notionPageId ?? "",
        ok: true,
      },
    ],
    apps: connectedApps(iso),
    genesisHash: "genesis",
  };
}

async function readStore(): Promise<StoreState> {
  try {
    const raw = await readFile(FILE, "utf8");
    const state = JSON.parse(raw) as StoreState;
    state.agents = structuredClone(agents);
    return state;
  } catch {
    const state = genesis();
    await persist(state);
    return state;
  }
}

async function persist(state: StoreState) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(state, null, 2), "utf8");
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function chainHash(prev: string, payload: string): string {
  return createHash("sha256").update(`${prev}:${payload}`).digest("hex").slice(0, 16);
}

function lastHash(state: StoreState): string {
  return state.audit.at(-1)?.hash ?? state.genesisHash;
}

function overlayApps(
  apps: StoreState["apps"],
  summaries: Awaited<ReturnType<typeof connectionSummaries>>
) {
  return apps.map((app) => {
    const live = summaries[app.id];
    return {
      ...app,
      status: live.status,
      oauthConfigured: live.oauthConfigured,
      accountLabel: live.accountLabel,
      lastSyncAt: live.connectedAt ?? app.lastSyncAt,
    };
  });
}

function clampRecord(record: InterceptRecord): InterceptRecord {
  return {
    ...record,
    createdAt: notBeforeOpen(record.createdAt),
    decidedAt: record.decidedAt ? notBeforeOpen(record.decidedAt) : record.decidedAt,
    events: record.events?.map((ev) => ({ ...ev, at: notBeforeOpen(ev.at) })),
  };
}

function reliabilityOf(intercepts: InterceptRecord[], events: StoreState["integrationEvents"]): PublicState["reliability"] {
  const live = events.filter((e) => e.kind !== "audit_append" && e.kind !== "audit_ping");
  const successes = live.filter((e) => e.ok).length;
  const failures = live.filter((e) => !e.ok).length;
  const retries = live.reduce((n, e) => n + (e.retries ?? 0), 0);
  const lat = live.map((e) => e.latencyMs).filter((n): n is number => typeof n === "number");
  const avgLatencyMs = lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : 0;
  const policyViolations = intercepts.filter((i) => i.status === "denied" || i.status === "rejected").length;
  const approvals = intercepts.filter((i) => i.decidedBy && i.decidedBy !== "aegis" && i.status === "executed").length;
  const blocked = intercepts.filter((i) => i.status === "denied").length;
  const held = intercepts.filter((i) => i.status === "pending").length;
  const redacted = intercepts.reduce((n, i) => n + (i.verdict.minimization?.redactedCount ?? 0), 0);
  const toolCalls = live.length;
  return {
    toolCalls,
    successes,
    failures,
    retries,
    avgLatencyMs,
    policyViolations,
    approvals,
    blocked,
    held,
    successRate: toolCalls ? Math.round((successes / toolCalls) * 100) : 100,
    redacted,
  };
}

function applyTimestampSpread(input: {
  intercepts: InterceptRecord[];
  audit: AuditEntry[];
  events: IntegrationEvent[];
  apps: StoreState["apps"];
}) {
  const buckets = new Map<string, { iso: string; sets: Array<(iso: string) => void> }>();
  const track = (key: string, iso: string, set: (iso: string) => void) => {
    const existing = buckets.get(key);
    if (existing) existing.sets.push(set);
    else buckets.set(key, { iso, sets: [set] });
  };

  for (const record of input.intercepts) {
    track(`created:${record.id}`, record.createdAt, (iso) => {
      record.createdAt = iso;
    });
    if (record.decidedAt) {
      track(`decided:${record.id}`, record.decidedAt, (iso) => {
        record.decidedAt = iso;
      });
    }
    for (const ev of record.events ?? []) {
      track(`event:${ev.id}`, ev.at, (iso) => {
        ev.at = iso;
      });
    }
  }
  for (const row of input.audit) {
    track(`audit:${row.id}`, row.at, (iso) => {
      row.at = iso;
    });
  }
  for (const ev of input.events) {
    track(`event:${ev.id}`, ev.at, (iso) => {
      ev.at = iso;
    });
  }
  for (const app of input.apps) {
    track(`sync:${app.id}`, app.lastSyncAt, (iso) => {
      app.lastSyncAt = iso;
    });
  }

  const keys = [...buckets.keys()];
  const next = spreadAfterOpen(keys.map((k) => buckets.get(k)!.iso));
  keys.forEach((k, i) => {
    for (const set of buckets.get(k)!.sets) set(next[i]);
  });
}

function toPublic(
  state: StoreState,
  summaries: Awaited<ReturnType<typeof connectionSummaries>>
): PublicState {
  const intercepts = [...state.intercepts].map(clampRecord);
  const events = [...state.integrationEvents].map((ev) => ({ ...ev, at: notBeforeOpen(ev.at) }));
  const audit = [...state.audit].map((row) => ({ ...row, at: notBeforeOpen(row.at) }));
  const apps = overlayApps(state.apps, summaries).map((app) => ({
    ...app,
    lastSyncAt: notBeforeOpen(app.lastSyncAt),
  }));
  applyTimestampSpread({ intercepts, audit, events, apps });
  intercepts.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const pending = intercepts.filter((i) => i.status === "pending");
  return {
    agents: state.agents,
    policies: state.policies,
    intercepts,
    pending,
    audit: audit.sort((a, b) => +new Date(b.at) - +new Date(a.at)),
    integrationEvents: [...events].sort((a, b) => +new Date(b.at) - +new Date(a.at)),
    apps,
    stats: {
      intercepted: intercepts.length,
      allowed: intercepts.filter((i) => i.status === "allowed" || i.status === "executed" || i.status === "previewed").length,
      pending: pending.length,
      denied: intercepts.filter((i) => i.status === "denied" || i.status === "rejected").length,
      executed: intercepts.filter((i) => i.status === "executed").length,
    },
    reliability: reliabilityOf(intercepts, events),
  };
}

function appendAudit(
  state: StoreState,
  entry: Omit<AuditEntry, "id" | "hash" | "prevHash">
): AuditEntry {
  const prevHash = lastHash(state);
  const hash = chainHash(prevHash, JSON.stringify(entry));
  const full: AuditEntry = {
    ...entry,
    id: `aud-${state.audit.length + 1}`,
    prevHash,
    hash,
  };
  state.audit.push(full);
  return full;
}

export async function getPublicState(): Promise<PublicState> {
  return enqueue(async () => {
    const state = await readStore();
    const summaries = await connectionSummaries();
    return toPublic(state, summaries);
  });
}

export async function resetStore(): Promise<PublicState> {
  return enqueue(async () => {
    const state = genesis();
    await persist(state);
    const summaries = await connectionSummaries();
    return toPublic(state, summaries);
  });
}

export async function updatePolicy(
  id: string,
  patch: Partial<Pick<Policy, "enabled" | "decision">>
): Promise<PublicState> {
  return enqueue(async () => {
    const state = await readStore();
    const policy = state.policies.find((p) => p.id === id);
    if (!policy) throw new Error("Policy not found");
    if (patch.enabled != null) policy.enabled = patch.enabled;
    if (patch.decision) policy.decision = patch.decision;
    await persist(state);
    const summaries = await connectionSummaries();
    return toPublic(state, summaries);
  });
}

export async function intercept(proposed: ProposedAction): Promise<{
  record: InterceptRecord;
  events: IntegrationEvent[];
  state: PublicState;
}> {
  return enqueue(async () => {
    const state = await readStore();
    const agent = state.agents.find((a) => a.id === proposed.agentId);
    const verdict = evaluate(proposed, agent, state.policies);
    const now = notBeforeOpen(new Date().toISOString());
    const id = `int-${createHash("sha256").update(`${now}:${proposed.summary}`).digest("hex").slice(0, 10)}`;

    const dryRun = Boolean(proposed.dryRun);
    const preview = actionPreview(proposed.app, proposed.action, proposed.payload);

    let status: InterceptRecord["status"] = "pending";
    if (dryRun) status = verdict.decision === "deny" ? "denied" : "previewed";
    else if (verdict.decision === "allow") status = "executed";
    else if (verdict.decision === "deny") status = "denied";

    const record: InterceptRecord = {
      id,
      createdAt: now,
      agentId: proposed.agentId,
      app: proposed.app,
      action: proposed.action,
      summary: proposed.summary,
      payload: proposed.payload,
      verdict,
      status,
      dryRun,
      preview,
      decidedAt: verdict.decision === "require_approval" && !dryRun ? undefined : now,
      decidedBy: verdict.decision === "require_approval" && !dryRun ? undefined : "aegis",
    };
    state.intercepts.push(record);

    const eventMap: Record<VerdictDecision, string> = {
      allow: dryRun ? "previewed" : "allowed",
      require_approval: dryRun ? "previewed" : "held",
      deny: "denied",
    };

    const audit = appendAudit(state, {
      at: now,
      interceptId: id,
      event: eventMap[verdict.decision],
      actor: "aegis",
      app: proposed.app,
      summary: `${eventMap[verdict.decision][0].toUpperCase()}${eventMap[verdict.decision].slice(1)} ${proposed.app} ${proposed.action} — ${proposed.summary}`,
    });

    const events = dryRun
      ? []
      : await executeDecision({
          record,
          agentName: agent?.name ?? "unknown",
          audit,
          mode: verdict.decision === "allow" ? "execute" : "intercept",
        });
    record.events = events;
    for (const ev of events) {
      state.integrationEvents.push(ev);
      if (ev.app === "notion" && ev.ok) {
        audit.notionPageId = ev.detail;
      }
    }

    const app = state.apps.find((a) => a.id === proposed.app);
    if (app) app.lastSyncAt = now;

    await persist(state);
    const summaries = await connectionSummaries();
    return { record, events, state: toPublic(state, summaries) };
  });
}

export async function resolveApproval(
  id: string,
  decision: "approve" | "reject",
  actor: string,
  note?: string
): Promise<{ record: InterceptRecord; state: PublicState }> {
  return enqueue(async () => {
    const state = await readStore();
    const record = state.intercepts.find((i) => i.id === id);
    if (!record) throw new Error("Intercept not found");
    if (record.status !== "pending") throw new Error("This request is no longer pending");

    const now = notBeforeOpen(new Date().toISOString());
    record.status = decision === "approve" ? "executed" : "rejected";
    record.decidedAt = now;
    record.decidedBy = actor;
    record.decisionNote = note;

    const audit = appendAudit(state, {
      at: now,
      interceptId: id,
      event: decision === "approve" ? "approved" : "rejected",
      actor,
      app: record.app,
      summary: `${actor} ${decision === "approve" ? "approved" : "rejected"} ${record.app} ${record.action}: ${record.summary}`,
    });

    const agent = state.agents.find((a) => a.id === record.agentId);
    const events = await executeDecision({
      record,
      agentName: agent?.name ?? "unknown",
      audit,
      mode: decision === "approve" ? "execute" : "reject",
    });
    record.events = [...(record.events ?? []), ...events];
    for (const ev of events) {
      state.integrationEvents.push(ev);
      if (ev.app === "notion" && ev.ok) audit.notionPageId = ev.detail;
    }

    await persist(state);
    const summaries = await connectionSummaries();
    return { record, state: toPublic(state, summaries) };
  });
}
