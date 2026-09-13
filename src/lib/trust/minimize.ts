import { createHash } from "crypto";
import type {
  ActionPayload,
  DataClass,
  MinimizationFinding,
  MinimizationResult,
  MinimizeAction,
  ProposedAction,
} from "./types";

export type { DataClass, MinimizationFinding, MinimizationResult, MinimizeAction };

const CLASS_LABEL: Record<DataClass, string> = {
  email: "EMAIL",
  phone: "PHONE",
  ssn: "SSN",
  credit_card: "PAN",
  api_key: "API_KEY",
  aws_key: "AWS_KEY",
  jwt: "JWT",
  ip: "IP",
  iban: "IBAN",
};

/** High-value secrets first so they are not swallowed by looser matchers. */
const DETECTORS: Array<{ class: DataClass; re: () => RegExp }> = [
  { class: "jwt", re: () => /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g },
  { class: "aws_key", re: () => /\bAKIA[0-9A-Z]{16}\b/g },
  { class: "api_key", re: () => /\b(?:sk_live_|sk_test_|ghp_|gho_|github_pat_|xoxb-|xoxp-|ntn_|secret_)[A-Za-z0-9_\-]{8,}\b/g },
  { class: "ssn", re: () => /\b\d{3}-\d{2}-\d{4}\b/g },
  { class: "iban", re: () => /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g },
  { class: "email", re: () => /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { class: "phone", re: () => /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g },
  { class: "ip", re: () => /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b/g },
  { class: "credit_card", re: () => /\b(?:4\d{12}(?:\d{3})?|5[1-5]\d{14}|3[47]\d{13}|(?:\d{4}[ -]){3}\d{4})\b/g },
];

const DEFAULT_ACTION: Record<DataClass, MinimizeAction> = {
  email: "redact",
  phone: "redact",
  ssn: "redact",
  credit_card: "redact",
  api_key: "redact",
  aws_key: "redact",
  jwt: "redact",
  ip: "hash",
  iban: "redact",
};

function luhnOk(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

export function payloadCorpus(payload: ActionPayload, summary?: string) {
  return [
    summary,
    payload.subject,
    payload.body,
    payload.content,
    ...(payload.to ?? []),
    payload.channel,
    payload.page,
    payload.repo,
    payload.prTitle,
  ]
    .filter(Boolean)
    .join("\n");
}

/** What would be handed to the model after a tool returns. Reads get a realistic fixture when the payload is empty. */
export function modelFacingText(proposed: ProposedAction) {
  const existing = [proposed.payload.body, proposed.payload.content].filter(Boolean).join("\n");
  if (existing) return payloadCorpus(proposed.payload, proposed.summary);
  if (proposed.action === "read") {
    if (proposed.app === "gmail") {
      return [
        proposed.summary,
        "From: Casey Rivera <casey@gmail.com>",
        "Phone: (415) 555-0134",
        "SSN on file: 078-05-1120",
        "Please refund order 18422 to the card on file.",
      ].join("\n");
    }
    if (proposed.app === "github") {
      return [
        proposed.summary,
        `Repo ${proposed.payload.repo ?? "acme/billing-api"}`,
        "Reviewer email: jordan@acme.internal",
      ].join("\n");
    }
    if (proposed.app === "slack") {
      return `${proposed.summary}\nLast message from maya@acme.internal in ${proposed.payload.channel ?? "#support"}`;
    }
    if (proposed.app === "notion") {
      return `${proposed.summary}\nOwner: casey@acme.internal`;
    }
  }
  return payloadCorpus(proposed.payload, proposed.summary);
}

export function detectDataClasses(text: string): Map<DataClass, string[]> {
  const found = new Map<DataClass, string[]>();
  const claimed = new Set<string>();
  for (const detector of DETECTORS) {
    const re = detector.re();
    const matches = text.match(re) ?? [];
    const kept: string[] = [];
    for (const match of matches) {
      if (claimed.has(match)) continue;
      if (detector.class === "credit_card" && !luhnOk(match)) continue;
      claimed.add(match);
      kept.push(match);
    }
    if (kept.length) found.set(detector.class, kept);
  }
  return found;
}

export function minimizeText(
  text: string,
  actions: Partial<Record<DataClass, MinimizeAction>> = {}
): MinimizationResult {
  const detected = detectDataClasses(text);
  const findings: MinimizationFinding[] = [];
  let next = text;
  let redactedCount = 0;

  for (const [dataClass, values] of detected) {
    const action = actions[dataClass] ?? DEFAULT_ACTION[dataClass];
    findings.push({
      class: dataClass,
      label: CLASS_LABEL[dataClass],
      count: values.length,
      action,
    });
    if (action === "allow") continue;
    for (const value of values) {
      redactedCount += 1;
      if (action === "drop") {
        next = next.split(value).join("");
      } else if (action === "hash") {
        next = next.split(value).join(`[${CLASS_LABEL[dataClass]}:${hashToken(value)}]`);
      } else {
        next = next.split(value).join(`[${CLASS_LABEL[dataClass]}]`);
      }
    }
  }

  return { findings, raw: text, forModel: next, redactedCount };
}

export function minimizeProposed(
  proposed: ProposedAction,
  actions: Partial<Record<DataClass, MinimizeAction>> = {}
) {
  return minimizeText(modelFacingText(proposed), actions);
}
