export type InjectionHit = { id: string; label: string; detail: string };

const RULES: Array<{ id: string; label: string; re: RegExp; detail: string }> = [
  {
    id: "ignore-instructions",
    label: "Instruction override",
    re: /ignore (all )?(previous|prior|above) instructions/i,
    detail: "Text tries to override the system or policy instructions.",
  },
  {
    id: "bypass-policy",
    label: "Policy bypass",
    re: /bypass (the )?(polic|trust|approval|aegis)|disable (the )?gate/i,
    detail: "Text asks the agent to skip TrustLayer policy or approval.",
  },
  {
    id: "role-hijack",
    label: "Role hijack",
    re: /you are now |act as (a )?system|new system prompt/i,
    detail: "Text tries to replace the agent’s role or system prompt.",
  },
  {
    id: "hide-from-human",
    label: "Concealment",
    re: /do not (tell|inform|notify|alert) (the )?(human|user|approver|security)/i,
    detail: "Text tries to hide the action from a human approver.",
  },
  {
    id: "zero-width",
    label: "Hidden characters",
    re: /[\u200b\u200c\u200d\ufeff]/,
    detail: "Payload contains zero-width characters used to hide instructions.",
  },
];

export function detectInjection(...parts: Array<string | undefined>): InjectionHit | null {
  const text = parts.filter(Boolean).join("\n");
  if (!text) return null;
  for (const rule of RULES) {
    if (rule.re.test(text)) {
      return { id: rule.id, label: rule.label, detail: rule.detail };
    }
  }
  return null;
}

export function actionPreview(app: string, action: string, payload: {
  to?: string[];
  channel?: string;
  page?: string;
  database?: string;
  repo?: string;
  prNumber?: number;
  subject?: string;
}) {
  if (app === "github") {
    const target = payload.repo ? `${payload.repo}${payload.prNumber ? `#${payload.prNumber}` : ""}` : "connected GitHub account";
    return { resource: target, effect: action === "read" ? "List or read" : action === "comment" ? "Comment (reversible)" : action };
  }
  if (app === "slack") {
    return { resource: payload.channel || "#unknown", effect: "Post a message" };
  }
  if (app === "notion") {
    return { resource: payload.page || payload.database || "connected Notion page", effect: "Write a page" };
  }
  if (app === "gmail") {
    const who = payload.to?.length ? payload.to.join(", ") : "inbox";
    return { resource: who, effect: action === "send" ? `Send “${payload.subject || "untitled"}”` : action };
  }
  return { resource: app, effect: action };
}
