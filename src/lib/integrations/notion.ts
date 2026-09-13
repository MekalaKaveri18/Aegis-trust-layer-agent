import { randomUUID } from "crypto";
import type { AuditEntry, IntegrationEvent, InterceptRecord } from "../trust/types";
import { missingConnectionEvent, requireConn } from "./util";

export async function appendNotionAudit(
  audit: AuditEntry,
  record: InterceptRecord,
  agentName: string
): Promise<IntegrationEvent> {
  const conn = await requireConn("notion");
  if (!conn) {
    return missingConnectionEvent("notion", "audit_append", "Notion is not connected — audit row not written.");
  }

  const parentId = conn.meta?.notionParentId;
  const parentType = conn.meta?.notionParentType;
  if (!parentId || !parentType) {
    return {
      id: randomUUID(),
      app: "notion",
      at: new Date().toISOString(),
      kind: "audit_append",
      summary: "Notion is connected but no shared page/database was found. Share a page with the Aegis integration.",
      detail: "",
      ok: false,
    };
  }

  const parent =
    parentType === "database_id" ? { database_id: parentId } : { page_id: parentId };

  const title = `${audit.event} · ${record.app}:${record.action}`;
  const body = [
    audit.summary,
    `Agent: ${agentName}`,
    `Hash: ${audit.hash}`,
    `Prev: ${audit.prevHash}`,
    `Intercept: ${record.id}`,
  ].join("\n");

  try {
    const payload =
      parentType === "database_id"
        ? {
            parent,
            properties: {
              Name: { title: [{ text: { content: title.slice(0, 100) } }] },
            },
            children: [
              {
                object: "block",
                type: "paragraph",
                paragraph: { rich_text: [{ type: "text", text: { content: body.slice(0, 1900) } }] },
              },
            ],
          }
        : {
            parent,
            properties: {
              title: { title: [{ text: { content: title.slice(0, 100) } }] },
            },
            children: [
              {
                object: "block",
                type: "paragraph",
                paragraph: { rich_text: [{ type: "text", text: { content: body.slice(0, 1900) } }] },
              },
            ],
          };

    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${conn.accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { id?: string; message?: string };
    if (!res.ok || !json.id) {
      return {
        id: randomUUID(),
        app: "notion",
        at: new Date().toISOString(),
        kind: "audit_append",
        summary: json.message || `Notion write failed (${res.status})`,
        detail: "",
        ok: false,
      };
    }
    return {
      id: randomUUID(),
      app: "notion",
      at: new Date().toISOString(),
      kind: "audit_append",
      summary: `Appended ${audit.event} to Notion Audit Logs`,
      detail: json.id,
      url: notionUrl(json.id),
      ok: true,
    };
  } catch (error) {
    return {
      id: randomUUID(),
      app: "notion",
      at: new Date().toISOString(),
      kind: "audit_append",
      summary: error instanceof Error ? error.message : "Notion API error",
      detail: "",
      ok: false,
    };
  }
}

export async function runNotionWrite(record: InterceptRecord): Promise<IntegrationEvent> {
  const conn = await requireConn("notion");
  if (!conn) {
    return missingConnectionEvent("notion", "notion_skipped", "Notion is not connected. Share a page with the integration.");
  }
  const parentId = conn.meta?.notionParentId;
  const parentType = conn.meta?.notionParentType;
  if (!parentId || !parentType) {
    return {
      id: randomUUID(),
      app: "notion",
      at: new Date().toISOString(),
      kind: "notion_error",
      summary: "Notion connected but no shared page. Share a page with Aegis.",
      detail: "",
      ok: false,
    };
  }
  const parent = parentType === "database_id" ? { database_id: parentId } : { page_id: parentId };
  const title = (record.payload.page || record.payload.database || "Aegis note").slice(0, 100);
  const body = (record.payload.content || record.summary).slice(0, 1900);
  try {
    const payload =
      parentType === "database_id"
        ? {
            parent,
            properties: { Name: { title: [{ text: { content: title } }] } },
            children: [
              {
                object: "block",
                type: "paragraph",
                paragraph: { rich_text: [{ type: "text", text: { content: body } }] },
              },
            ],
          }
        : {
            parent,
            properties: { title: { title: [{ text: { content: title } }] } },
            children: [
              {
                object: "block",
                type: "paragraph",
                paragraph: { rich_text: [{ type: "text", text: { content: body } }] },
              },
            ],
          };
    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${conn.accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { id?: string; message?: string };
    if (!res.ok || !json.id) {
      return {
        id: randomUUID(),
        app: "notion",
        at: new Date().toISOString(),
        kind: "notion_error",
        summary: json.message || `Notion write failed (${res.status})`,
        detail: "",
        ok: false,
      };
    }
    return {
      id: randomUUID(),
      app: "notion",
      at: new Date().toISOString(),
      kind: "page_written",
      summary: `Wrote “${title}” to Notion after trust check`,
      detail: json.id,
      url: notionUrl(json.id),
      ok: true,
    };
  } catch (error) {
    return {
      id: randomUUID(),
      app: "notion",
      at: new Date().toISOString(),
      kind: "notion_error",
      summary: error instanceof Error ? error.message : "Notion API error",
      detail: "",
      ok: false,
    };
  }
}

function notionUrl(id: string) {
  return `https://notion.so/${id.replace(/-/g, "")}`;
}
