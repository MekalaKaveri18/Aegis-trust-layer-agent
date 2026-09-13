import { intercept } from "@/lib/trust/store";
import { minimizeText } from "@/lib/trust/minimize";
import { agents } from "@/lib/trust/seed";
import type { AgentAction, AppId, ProposedAction } from "@/lib/trust/types";

export const MCP_PROTOCOL = "2024-11-05";

export const MCP_TOOLS = [
  {
    name: "gmail.read",
    description: "Read Gmail through Aegis. Tool output is minimized before it reaches the model.",
    app: "gmail" as AppId,
    action: "read" as AgentAction,
  },
  {
    name: "gmail.send",
    description: "Send Gmail through the trust layer. Secrets and PII are gated by policy.",
    app: "gmail" as AppId,
    action: "send" as AgentAction,
  },
  {
    name: "slack.post",
    description: "Post to Slack after Aegis scores the payload and redacts sensitive fields.",
    app: "slack" as AppId,
    action: "post" as AgentAction,
  },
  {
    name: "notion.write",
    description: "Write Notion through Aegis. Policy hub edits are denied.",
    app: "notion" as AppId,
    action: "write" as AgentAction,
  },
  {
    name: "github.merge",
    description: "Request a GitHub merge. Irreversible actions are held for a human.",
    app: "github" as AppId,
    action: "merge" as AgentAction,
  },
] as const;

function toolSchema() {
  return {
    type: "object",
    properties: {
      agentId: { type: "string", description: "Registered agent id. Defaults to support-copilot." },
      summary: { type: "string" },
      to: { type: "array", items: { type: "string" } },
      subject: { type: "string" },
      body: { type: "string" },
      channel: { type: "string" },
      database: { type: "string" },
      repo: { type: "string" },
      prNumber: { type: "number" },
    },
  };
}

export function listMcpTools() {
  return MCP_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: toolSchema(),
  }));
}

export function initializeMcp() {
  return {
    protocolVersion: MCP_PROTOCOL,
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: "aegis-trust-layer", version: "0.1.0" },
    instructions:
      "Call tools through Aegis. Responses are policy-minimized. Sensitive values are redacted before they reach the model.",
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return undefined;
}

export async function callMcpTool(name: string, args: Record<string, unknown> = {}) {
  const tool = MCP_TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  const agentId = asString(args.agentId) || (tool.app === "github" ? "code-agent" : "support-copilot");
  const agent = agents.find((a) => a.id === agentId);
  const proposed: ProposedAction = {
    agentId: agent?.id ?? "support-copilot",
    app: tool.app,
    action: tool.action,
    summary: asString(args.summary) || `${tool.action} via MCP ${tool.name}`,
    payload: {
      to: asStringArray(args.to),
      subject: asString(args.subject),
      body: asString(args.body),
      content: asString(args.content) ?? asString(args.body),
      channel: asString(args.channel),
      database: asString(args.database),
      repo: asString(args.repo),
      prNumber: typeof args.prNumber === "number" ? args.prNumber : undefined,
      prTitle: asString(args.prTitle),
    },
  };
  const result = await intercept(proposed);
  const minimization = result.record.verdict.minimization;
  return {
    record: result.record,
    state: result.state,
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            verdict: result.record.verdict.decision,
            risk: result.record.verdict.riskLevel,
            forModel: minimization?.forModel ?? "",
            findings: minimization?.findings ?? [],
          },
          null,
          2
        ),
      },
    ],
    isError: result.record.verdict.decision === "deny",
  };
}

export function minimizeForSdk(text: string) {
  return minimizeText(text);
}

export async function handleMcpRpc(body: {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}) {
  const id = body.id ?? null;
  const method = body.method ?? "";
  const params = body.params ?? {};
  try {
    if (method === "initialize") {
      return { jsonrpc: "2.0", id, result: initializeMcp() };
    }
    if (method === "notifications/initialized" || method === "ping") {
      return { jsonrpc: "2.0", id, result: {} };
    }
    if (method === "tools/list") {
      return { jsonrpc: "2.0", id, result: { tools: listMcpTools() } };
    }
    if (method === "tools/call") {
      const name = typeof params.name === "string" ? params.name : "";
      const args =
        params.arguments && typeof params.arguments === "object" && !Array.isArray(params.arguments)
          ? (params.arguments as Record<string, unknown>)
          : {};
      const called = await callMcpTool(name, args);
      return { jsonrpc: "2.0", id, result: { content: called.content, isError: called.isError } };
    }
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    };
  } catch (e) {
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32000, message: e instanceof Error ? e.message : "MCP error" },
    };
  }
}
