import { randomUUID } from "crypto";
import type { IntegrationEvent } from "../trust/types";
import { missingConnectionEvent, requireConn } from "./util";

export async function postSlack(
  kind: string,
  text: string,
  channel: string
): Promise<IntegrationEvent> {
  const conn = await requireConn("slack");
  if (!conn) {
    return missingConnectionEvent("slack", kind, `Slack is not connected — skipped posting to ${channel}.`);
  }

  const name = channel.replace(/^#/, "");
  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${conn.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel: name, text }),
    });
    const json = (await res.json()) as { ok: boolean; error?: string; ts?: string };
    if (!json.ok) {
      return {
        id: randomUUID(),
        app: "slack",
        at: new Date().toISOString(),
        kind,
        summary: `Slack ${channel}: ${json.error || "post failed"}`,
        detail: json.error || "",
        ok: false,
      };
    }
    return {
      id: randomUUID(),
      app: "slack",
      at: new Date().toISOString(),
      kind,
      summary: `Posted to ${channel.startsWith("#") ? channel : `#${channel}`}`,
      detail: json.ts || "",
      ok: true,
    };
  } catch (error) {
    return {
      id: randomUUID(),
      app: "slack",
      at: new Date().toISOString(),
      kind,
      summary: error instanceof Error ? error.message : "Slack API error",
      detail: "",
      ok: false,
    };
  }
}
