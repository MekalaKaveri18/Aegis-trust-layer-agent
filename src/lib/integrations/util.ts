import { randomUUID } from "crypto";
import type { AppId, IntegrationEvent } from "../trust/types";
import { getConnection } from "../oauth/connections";

export function missingConnectionEvent(app: AppId, kind: string, summary: string): IntegrationEvent {
  return {
    id: randomUUID(),
    app,
    at: new Date().toISOString(),
    kind,
    summary,
    detail: "not_connected",
    ok: false,
  };
}

export async function requireConn(app: AppId) {
  return getConnection(app);
}
