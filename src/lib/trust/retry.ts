import type { IntegrationEvent } from "../trust/types";

function retryable(ev: IntegrationEvent) {
  const text = `${ev.kind} ${ev.summary}`.toLowerCase();
  if (text.includes("not_connected") || text.includes("not connected")) return false;
  if (text.includes("missing")) return false;
  return !ev.ok;
}

export async function withRetry(
  fn: () => Promise<IntegrationEvent>,
  opts?: { injectTimeout?: boolean }
): Promise<IntegrationEvent> {
  const started = Date.now();
  if (opts?.injectTimeout) {
    const second = await fn();
    return {
      ...second,
      retries: 1,
      latencyMs: Date.now() - started,
      summary: second.ok
        ? `${second.summary} after 1 automatic retry`
        : `${second.summary} (retried once)`,
      detail: second.detail
        ? `${second.detail}`
        : "First attempt: injected timeout. Second attempt: live call.",
    };
  }

  const first = await fn();
  if (first.ok || !retryable(first)) {
    return { ...first, retries: 0, latencyMs: Date.now() - started };
  }
  const second = await fn();
  return {
    ...second,
    retries: 1,
    latencyMs: Date.now() - started,
    summary: second.ok ? `${second.summary} after 1 automatic retry` : `${second.summary} (retried once)`,
  };
}
