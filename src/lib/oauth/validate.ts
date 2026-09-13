import type { AppId } from "@/lib/trust/types";

export function normalizeCredential(value: string) {
  return value.trim().replace(/^["']+|["']+$/g, "").replace(/\s+/g, "");
}

export function oauthClientIssue(provider: AppId, clientId: string, clientSecret: string): string | null {
  const id = normalizeCredential(clientId);
  const secret = clientSecret.trim().replace(/^["']+|["']+$/g, "");
  if (!id || !secret) return "Paste both the Client ID and the client secret from the developer console.";
  if (id.includes("@")) {
    return "That is an email address, not an OAuth Client ID. Google then shows 401 invalid_client (Not a valid email or user ID). Copy the Client ID from the cloud console — it is not your login.";
  }
  if (provider === "gmail") {
    if (!/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/i.test(id)) {
      return "Gmail needs a Google Cloud Web client ID that looks like 123456789-abc.apps.googleusercontent.com. Create it under APIs & Services → Credentials → Create OAuth client ID → Web application.";
    }
    if (!secret.startsWith("GOCSPX-")) {
      return "That is not a Google client secret (it should start with GOCSPX-). Do not use your Gmail password.";
    }
  }
  if (provider === "slack" && !/^\d+\.\d+$/.test(id)) {
    return "Slack Client ID looks like 1234567890.1234567890, from api.slack.com/apps → your app → Basic Information.";
  }
  if (provider === "notion") {
    if (/^(xox[baprsue]-|ghp_|gho_|github_pat_|GOCSPX-|ya29)/i.test(id) || /^(xox|GOCSPX-|ghp_)/i.test(secret)) {
      return "Those credentials belong to Slack, GitHub, or Google — not Notion. Notion’s OAuth Client ID is a UUID from a Public integration. Easier path: Internal integration → copy the secret (ntn_ or secret_) under I have a token.";
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return "Notion shows “Missing or incomplete Client ID” when this is not a UUID. Create a Public integration at notion.so/my-integrations, or skip OAuth and paste an Internal integration secret (starts with ntn_ or secret_) on I have a token.";
    }
  }
  return null;
}

export function accessTokenIssue(provider: AppId, token: string): string | null {
  const value = token.trim();
  if (!value) return "Paste a token first.";
  if (provider === "notion") {
    if (/^(xox[baprsue]-|ghp_|gho_|github_pat_|ya29|GOCSPX-)/i.test(value)) {
      return "That token is not a Notion integration secret. Create an Internal integration at notion.so/my-integrations and paste the secret that starts with ntn_ or secret_.";
    }
    if (!/^(ntn_|secret_)/i.test(value)) {
      return "Notion internal secrets start with ntn_ or secret_. After saving, open the Notion page you want and Share → Invite the integration.";
    }
  }
  return null;
}

export function explainOAuthError(error?: string | null) {
  if (!error) return null;
  if (error === "invalid_auth") {
    return "Slack rejected this token. Use a Bot User OAuth Token that starts with xoxb-.";
  }
  if (/missing or incomplete client id/i.test(error)) {
    return "Notion did not get a Public OAuth Client ID (a UUID). Do not paste Slack or Google values. Fastest fix: notion.so/my-integrations → Internal integration → copy ntn_ / secret_ → Connect Notion → I have a token, then share a page with the integration.";
  }
  if (error.includes("invalid_client") || error.includes("Not a valid email")) {
    return "Google did not receive a Web OAuth Client ID. Paste the Client ID from Google Cloud (ends in .apps.googleusercontent.com) and the GOCSPX- secret.";
  }
  return error;
}
