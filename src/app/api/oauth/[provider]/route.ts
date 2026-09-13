import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import type { AppId } from "@/lib/trust/types";
import { authorizeUrl, publicOrigin } from "@/lib/oauth/config";
import { oauthClientReady } from "@/lib/oauth/clients";
import { putOauthState } from "@/lib/oauth/connections";

const PROVIDERS: AppId[] = ["gmail", "slack", "notion", "github"];

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!PROVIDERS.includes(provider as AppId)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }
  const app = provider as AppId;
  const origin = publicOrigin(request);
  if (!(await oauthClientReady(app))) {
    return NextResponse.redirect(
      `${origin}/connect/${app}?error=${encodeURIComponent(
        "Paste a real OAuth Client ID and secret from the developer console — not your email or password."
      )}`
    );
  }
  const state = randomBytes(16).toString("hex");
  await putOauthState(state, app, origin);
  return NextResponse.redirect(await authorizeUrl(app, state, origin));
}
