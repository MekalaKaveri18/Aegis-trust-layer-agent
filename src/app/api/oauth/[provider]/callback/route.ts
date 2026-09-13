import { NextResponse } from "next/server";
import type { AppId } from "@/lib/trust/types";
import { exchangeCode, publicOrigin } from "@/lib/oauth/config";
import { saveConnection, takeOauthState } from "@/lib/oauth/connections";

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const url = new URL(request.url);
  const origin = publicOrigin(request);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(`${origin}/apps?error=${encodeURIComponent(oauthError)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${origin}/apps?error=missing_code`);
  }

  const expected = await takeOauthState(state);
  if (!expected || expected.provider !== provider) {
    return NextResponse.redirect(`${origin}/apps?error=invalid_state`);
  }

  try {
    const tokens = await exchangeCode(provider as AppId, code, expected.origin);
    await saveConnection({
      provider: provider as AppId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      accountLabel: tokens.accountLabel,
      meta: tokens.meta,
      connectedAt: new Date().toISOString(),
    });
    return NextResponse.redirect(`${origin}/apps?connected=${provider}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "oauth_failed";
    return NextResponse.redirect(`${origin}/apps?error=${encodeURIComponent(message)}`);
  }
}
