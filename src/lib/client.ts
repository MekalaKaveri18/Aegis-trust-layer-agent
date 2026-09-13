import type { AgentRun } from "./agent/types";
import type { InterceptRecord, ProposedAction, PublicState, VerdictDecision } from "./trust/types";

async function request<T>(input: RequestInfo, init?: RequestInit, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal, cache: "no-store" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message =
        (body && typeof body === "object" && "error" in body && String(body.error)) ||
        (await res.text().catch(() => "")) ||
        `Request failed (${res.status})`;
      throw new Error(message);
    }
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out. Is the Aegis server running?");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchState(): Promise<PublicState> {
  return request<PublicState>("/api/state");
}

export async function submitIntercept(action: ProposedAction) {
  return request<{ record: InterceptRecord; events: unknown; state: PublicState }>("/api/intercept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
}

export async function simulate(scenario: string) {
  return request<{ scenario: string; record: InterceptRecord; events: unknown; state: PublicState }>(
    "/api/simulate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario }),
    }
  );
}

export async function resolveApproval(id: string, decision: "approve" | "reject", note?: string) {
  return request<{ record: InterceptRecord; state: PublicState }>("/api/approvals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, decision, actor: "Maya Chen", note }),
  });
}

export async function patchPolicy(id: string, patch: { enabled?: boolean; decision?: VerdictDecision }) {
  return request<PublicState>("/api/policies", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...patch }),
  });
}

export async function playControlStory() {
  return request<{
    beats: Array<{
      id: string;
      title: string;
      hint: string;
      record: InterceptRecord;
      events: unknown;
    }>;
    state: PublicState;
  }>("/api/demo/story", { method: "POST" }, 60000);
}

export async function resetDemo() {
  return request<PublicState>("/api/reset", { method: "POST" });
}

export async function runSupportAgent(goal: string) {
  return request<{ run: AgentRun }>(
    "/api/agent/run",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, job: "triage" }),
    },
    120000
  );
}

export async function runWeeklyAgent(goal: string, dryRun: boolean) {
  return request<{ run: AgentRun }>(
    "/api/agent/run",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, job: "weekly", dryRun }),
    },
    120000
  );
}
