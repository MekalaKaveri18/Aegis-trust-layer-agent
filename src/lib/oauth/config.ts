import type { AppId } from "@/lib/trust/types";
import { getOAuthClient } from "./clients";

export function appBaseUrl() {
  const explicit = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (explicit) return explicit;
  const vercelHost = (process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  if (vercelHost) return `https://${vercelHost}`;
  return "https://127.0.0.1:43147";
}

/** Browser-safe origin. 0.0.0.0 / :: are bind addresses and cause ERR_ADDRESS_INVALID. */
export function publicOrigin(request: Request) {
  const url = new URL(request.url);
  const forwarded = (request.headers.get("x-forwarded-host") || "").split(",")[0].trim();
  const hostHeader = forwarded || request.headers.get("host") || url.host;
  let hostname = url.hostname;
  let port = url.port;
  try {
    const parsed = new URL(`http://${hostHeader}`);
    hostname = parsed.hostname;
    port = parsed.port || url.port;
  } catch {
    /* keep url host */
  }
  if (hostname === "0.0.0.0" || hostname === "[::]" || hostname === "::" || hostname === "") {
    hostname = "127.0.0.1";
  }
  if (!port && hostname === "127.0.0.1") {
    try {
      port = new URL(appBaseUrl()).port || "43147";
    } catch {
      port = "43147";
    }
  }
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    url.protocol.replace(":", "") ||
    "https";
  const suffix = port && port !== "80" && port !== "443" ? `:${port}` : "";
  return `${proto}://${hostname}${suffix}`;
}

export function redirectUri(provider: AppId, origin?: string) {
  const base = (origin || appBaseUrl()).replace(/\/$/, "");
  return `${base}/api/oauth/${provider}/callback`;
}

export async function authorizeUrl(provider: AppId, state: string, origin?: string): Promise<string> {
  const client = await getOAuthClient(provider);
  if (!client) throw new Error(`${provider} OAuth client is not configured`);
  const redirect = redirectUri(provider, origin);
  if (provider === "gmail") {
    const params = new URLSearchParams({
      client_id: client.clientId,
      redirect_uri: redirect,
      response_type: "code",
      scope: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.compose",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }
  if (provider === "slack") {
    const params = new URLSearchParams({
      client_id: client.clientId,
      redirect_uri: redirect,
      state,
      scope: ["chat:write", "channels:read", "channels:join", "groups:read", "im:write"].join(","),
    });
    return `https://slack.com/oauth/v2/authorize?${params}`;
  }
  if (provider === "notion") {
    const params = new URLSearchParams({
      client_id: client.clientId,
      redirect_uri: redirect,
      response_type: "code",
      owner: "user",
      state,
    });
    return `https://api.notion.com/v1/oauth/authorize?${params}`;
  }
  const params = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: redirect,
    scope: "repo read:user user:email",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeCode(provider: AppId, code: string, origin?: string) {
  const client = await getOAuthClient(provider);
  if (!client) throw new Error(`${provider} OAuth client is not configured`);
  const redirect = redirectUri(provider, origin);
  if (provider === "gmail") {
    const body = new URLSearchParams({
      code,
      client_id: client.clientId,
      client_secret: client.clientSecret,
      redirect_uri: redirect,
      grant_type: "authorization_code",
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    };
    if (!json.access_token) throw new Error(json.error || "Google token exchange failed");
    const me = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${json.access_token}` },
    });
    const profile = (await me.json()) as { email?: string };
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : undefined,
      accountLabel: profile.email ?? "Gmail",
      meta: { email: profile.email },
    };
  }

  if (provider === "slack") {
    const body = new URLSearchParams({
      code,
      client_id: client.clientId,
      client_secret: client.clientSecret,
      redirect_uri: redirect,
    });
    const res = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await res.json()) as {
      ok: boolean;
      error?: string;
      access_token?: string;
      team?: { name?: string; id?: string };
      bot_user_id?: string;
    };
    if (!json.ok || !json.access_token) throw new Error(json.error || "Slack token exchange failed");
    return {
      accessToken: json.access_token,
      accountLabel: json.team?.name ?? "Slack",
      meta: { team: json.team?.name, teamId: json.team?.id, botUserId: json.bot_user_id },
    };
  }

  if (provider === "notion") {
    const basic = Buffer.from(`${client.clientId}:${client.clientSecret}`).toString("base64");
    const res = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirect,
      }),
    });
    const json = (await res.json()) as {
      access_token?: string;
      error?: string;
      workspace_name?: string;
      workspace_id?: string;
    };
    if (!json.access_token) throw new Error(json.error || "Notion token exchange failed");
    const parent = await findNotionParent(json.access_token);
    return {
      accessToken: json.access_token,
      accountLabel: json.workspace_name ?? "Notion",
      meta: {
        notionWorkspace: json.workspace_name,
        workspaceId: json.workspace_id,
        notionParentId: parent?.id,
        notionParentType: parent?.type,
      },
    };
  }

  const body = new URLSearchParams({
    code,
    client_id: client.clientId,
    client_secret: client.clientSecret,
    redirect_uri: redirect,
  });
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!json.access_token) throw new Error(json.error_description || json.error || "GitHub token exchange failed");
  const me = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${json.access_token}`, "User-Agent": "aegis-trust-layer" },
  });
  const profile = (await me.json()) as { login?: string };
  return {
    accessToken: json.access_token,
    accountLabel: profile.login ? `@${profile.login}` : "GitHub",
    meta: { githubLogin: profile.login },
  };
}

export async function findNotionParent(token: string): Promise<{ id: string; type: "database_id" | "page_id" } | null> {
  const res = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ page_size: 20 }),
  });
  const json = (await res.json()) as { results?: Array<{ id: string; object: string }> };
  const page = json.results?.find((r) => r.object === "page");
  if (page) return { id: page.id, type: "page_id" };
  const db = json.results?.find((r) => r.object === "database");
  if (db) return { id: db.id, type: "database_id" };
  return null;
}

export async function verifyAccessToken(provider: AppId, accessToken: string) {
  if (provider === "gmail") {
    const me = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = (await me.json()) as { email?: string; error?: { message?: string } };
    if (!me.ok || !profile.email) throw new Error(profile.error?.message || "That Google token is not valid.");
    return { accountLabel: profile.email, meta: { email: profile.email } };
  }
  if (provider === "slack") {
    const res = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = (await res.json()) as { ok: boolean; error?: string; team?: string; user?: string };
    if (!json.ok) {
      const hint =
        json.error === "invalid_auth"
          ? "Slack rejected this token (invalid_auth). Use a bot token that starts with xoxb-, not a user token or webhook URL."
          : json.error || "That Slack token is not valid.";
      throw new Error(hint);
    }
    return { accountLabel: json.team || json.user || "Slack", meta: { team: json.team } };
  }
  if (provider === "notion") {
    const res = await fetch("https://api.notion.com/v1/users/me", {
      headers: { Authorization: `Bearer ${accessToken}`, "Notion-Version": "2022-06-28" },
    });
    if (!res.ok) throw new Error("That Notion token is not valid. Share a page with the integration.");
    const parent = await findNotionParent(accessToken);
    return {
      accountLabel: "Notion",
      meta: { notionParentId: parent?.id, notionParentType: parent?.type },
    };
  }
  const me = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "aegis-trust-layer" },
  });
  const profile = (await me.json()) as { login?: string; message?: string };
  if (!me.ok || !profile.login) throw new Error(profile.message || "That GitHub token is not valid.");
  return { accountLabel: `@${profile.login}`, meta: { githubLogin: profile.login } };
}

