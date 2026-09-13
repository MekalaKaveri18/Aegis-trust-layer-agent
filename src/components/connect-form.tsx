"use client";

import { AppLogo } from "@/components/brand-logos";
import { PageHeader, Panel, ProductBody } from "@/components/page-header";
import type { AppId } from "@/lib/trust/types";
import Link from "next/link";
import { explainOAuthError } from "@/lib/oauth/validate";
import { useRouter } from "next/navigation";
import { useState } from "react";

const HELP: Record<AppId, { oauth: string; token: string; tokenLabel: string; idPh: string; secretPh: string }> = {
  gmail: {
    oauth:
      "Do not use your Gmail address or password. Google then shows “invalid_client / Not a valid email or user ID.” In Google Cloud: APIs & Services → Credentials → Create OAuth client ID → Web application. Copy the Client ID (…apps.googleusercontent.com) and the secret that starts with GOCSPX-. JavaScript origin: https://127.0.0.1:43147. Redirect URI: the callback below. Enable Gmail API. Consent screen can stay Testing; add your Google account as a test user.",
    token: "Or paste a Google OAuth access token with Gmail scopes (not the client secret, not your password).",
    tokenLabel: "Google access token",
    idPh: "123456789-abc.apps.googleusercontent.com",
    secretPh: "GOCSPX-…",
  },
  slack: {
    oauth:
      "Create a Slack app → OAuth & Permissions. Add the callback URL. Bot scopes: chat:write, channels:read, channels:join, groups:read, im:write.",
    token:
      "Paste a Bot User OAuth Token from Slack → your app → OAuth & Permissions. It must start with xoxb-. Invite the bot to #aegis-approvals.",
    tokenLabel: "Slack bot token (xoxb-…)",
    idPh: "1234567890.1234567890",
    secretPh: "Slack client secret",
  },
  notion: {
    oauth:
      "OAuth needs a Public integration (not Internal). At notion.so/my-integrations → New integration → Type Public. OAuth Client ID is a UUID with dashes. Redirect URI: the callback below. Notion’s “Missing or incomplete Client ID” means a Slack token or Google secret was pasted here.",
    token:
      "Recommended: Internal integration → copy the secret (starts with ntn_ or secret_). Then in Notion, Share the page with that integration. Do not paste xoxe- Slack tokens or GOCSPX- Google secrets.",
    tokenLabel: "Notion integration secret (ntn_… or secret_…)",
    idPh: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    secretPh: "Notion OAuth client secret",
  },
  github: {
    oauth:
      "Create a GitHub OAuth App. Set the callback URL below. Scopes: repo. Then Allow on GitHub.",
    token: "Or paste a personal access token with repo scope.",
    tokenLabel: "GitHub personal access token",
    idPh: "GitHub OAuth client ID",
    secretPh: "GitHub client secret",
  },
};

function friendlyError(error?: string) {
  return explainOAuthError(error);
}

export function ConnectForm({
  provider,
  name,
  callbackUrl,
  error,
  clientReady,
}: {
  provider: AppId;
  name: string;
  callbackUrl: string;
  error?: string;
  clientReady?: boolean;
}) {
  const router = useRouter();
  const help = HELP[provider];
  const [mode, setMode] = useState<"oauth" | "token">(
    error === "invalid_auth" || provider === "notion" ? "token" : "oauth"
  );
  const [message, setMessage] = useState<string | null>(friendlyError(error));
  const [busy, setBusy] = useState(false);

  async function onToken(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const token = String(new FormData(e.currentTarget).get("accessToken") || "").trim();
    try {
      const res = await fetch(`/api/oauth/${provider}/token`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ accessToken: token }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(friendlyError(data.error) || "Could not connect.");
        return;
      }
      router.push(`/apps?connected=${provider}`);
      router.refresh();
    } catch {
      setMessage("Could not reach Aegis. Open https://127.0.0.1:43147 instead of 0.0.0.0, and accept the local certificate warning.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        lead={
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-dashed border-[#cfcfcf] bg-[#fafafa]">
            <AppLogo app={provider} className="size-5" />
          </span>
        }
        title={`Connect ${name}`}
        description={
          provider === "notion"
            ? "Gmail, Slack, and GitHub are separate. For Notion, use an Internal integration secret, or a Public integration UUID — not Slack or Google credentials."
            : "OAuth Client ID and secret come from the developer console, not your account email or password."
        }
      />
      <ProductBody className="mx-auto max-w-lg space-y-6">

      {message ? <p className="text-[13px] leading-relaxed text-red-600">{message}</p> : null}

      <div className="seg">
        <button type="button" data-active={mode === "oauth"} onClick={() => setMode("oauth")}>
          Sign in with {name}
        </button>
        <button type="button" data-active={mode === "token"} onClick={() => setMode("token")}>
          I have a token
        </button>
      </div>

      {mode === "oauth" ? (
        <Panel>
          <form action={`/api/oauth/${provider}/setup`} method="post" className="space-y-3 p-4">
            {clientReady ? (
              <p className="text-[13px] text-[#555]">
                Credentials are already saved.{" "}
                <a href={`/api/oauth/${provider}`} className="text-[#0c0c0c] underline">
                  Continue to {name}
                </a>{" "}
                or paste a new Client ID below if Google showed invalid_client.
              </p>
            ) : null}
            <p className="text-[13px] text-[#737373]">{help.oauth}</p>
            <label className="grid gap-1.5 text-[13px]">
              Callback URL
              <input readOnly value={callbackUrl} className="field font-mono text-xs" />
            </label>
            <label className="grid gap-1.5 text-[13px]">
              OAuth Client ID
              <input
                name="clientId"
                required
                placeholder={help.idPh}
                className="field font-mono text-xs"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="grid gap-1.5 text-[13px]">
              OAuth client secret
              <input
                name="clientSecret"
                type="password"
                required
                placeholder={help.secretPh}
                className="field font-mono text-xs"
                autoComplete="new-password"
              />
            </label>
            <button type="submit" className="btn-primary">
              Continue to {name}
            </button>
          </form>
        </Panel>
      ) : (
        <Panel>
          <form onSubmit={(e) => void onToken(e)} className="space-y-3 p-4">
            <p className="text-[13px] text-[#737373]">{help.token}</p>
            <label className="grid gap-1.5 text-[13px]">
              {help.tokenLabel}
              <input name="accessToken" type="password" required className="field" autoComplete="off" />
            </label>
            <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
              {busy ? "Checking…" : `Connect ${name}`}
            </button>
          </form>
        </Panel>
      )}

      <Link href="/apps" className="text-[13px] text-[#737373] hover:text-[#0c0c0c]">
        ← Integrations
      </Link>
      </ProductBody>
    </div>
  );
}
