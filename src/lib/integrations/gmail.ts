import { randomUUID } from "crypto";
import type { IntegrationEvent, InterceptRecord } from "../trust/types";
import { missingConnectionEvent, requireConn } from "./util";

export async function runGmail(record: InterceptRecord): Promise<IntegrationEvent> {
  const conn = await requireConn("gmail");
  if (!conn) {
    return missingConnectionEvent("gmail", "gmail_skipped", "Gmail is not connected. Connect it on the Apps page.");
  }

  try {
    if (record.action === "read") {
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8", {
        headers: { Authorization: `Bearer ${conn.accessToken}` },
      });
      const json = (await res.json()) as { messages?: { id: string }[]; error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message || `Gmail read failed (${res.status})`);
      const threads = [];
      for (const msg of (json.messages ?? []).slice(0, 5)) {
        const detail = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
          { headers: { Authorization: `Bearer ${conn.accessToken}` } }
        );
        const body = (await detail.json()) as {
          snippet?: string;
          payload?: { headers?: { name: string; value: string }[] };
          error?: { message: string };
        };
        if (!detail.ok) continue;
        const headers = Object.fromEntries((body.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value]));
        threads.push({
          id: msg.id,
          from: headers.from ?? "",
          subject: headers.subject ?? "(no subject)",
          snippet: body.snippet ?? "",
        });
      }
      return {
        ...ok("inbox_read", `Read ${threads.length} Gmail threads`, threads[0]?.id ?? ""),
        data: { threads },
      };
    }

    const raw = rfc822(record.payload.to ?? [], record.payload.subject ?? "(no subject)", record.payload.body ?? "");
    if (record.action === "draft") {
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
        method: "POST",
        headers: { Authorization: `Bearer ${conn.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: { raw } }),
      });
      const json = (await res.json()) as { id?: string; error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message || `Gmail draft failed (${res.status})`);
      return ok("draft_created", `Created Gmail draft “${record.payload.subject ?? "untitled"}”`, json.id ?? "");
    }

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${conn.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    const json = (await res.json()) as { id?: string; error?: { message: string } };
    if (!res.ok) throw new Error(json.error?.message || `Gmail send failed (${res.status})`);
    return ok(
      "message_sent",
      `Sent mail after trust check (${record.payload.to?.length ?? 0} recipients)`,
      json.id ?? ""
    );
  } catch (error) {
    return {
      id: randomUUID(),
      app: "gmail",
      at: new Date().toISOString(),
      kind: "gmail_error",
      summary: error instanceof Error ? error.message : "Gmail API error",
      detail: "",
      ok: false,
    };
  }
}

function rfc822(to: string[], subject: string, body: string) {
  const msg = [`To: ${to.join(", ")}`, `Subject: ${subject}`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=utf-8", "", body].join(
    "\r\n"
  );
  return Buffer.from(msg).toString("base64url");
}

function ok(kind: string, summary: string, detail: string): IntegrationEvent {
  return {
    id: randomUUID(),
    app: "gmail",
    at: new Date().toISOString(),
    kind,
    summary,
    detail,
    ok: true,
  };
}
