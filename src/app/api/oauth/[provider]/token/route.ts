import { NextResponse } from "next/server";
import type { AppId } from "@/lib/trust/types";
import { publicOrigin, verifyAccessToken } from "@/lib/oauth/config";
import { saveConnection } from "@/lib/oauth/connections";
import { accessTokenIssue } from "@/lib/oauth/validate";

const PROVIDERS: AppId[] = ["gmail", "slack", "notion", "github"];

function wantsJson(request: Request) {
  const accept = request.headers.get("accept") || "";
  const contentType = request.headers.get("content-type") || "";
  return accept.includes("application/json") || contentType.includes("application/json");
}

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!PROVIDERS.includes(provider as AppId)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }
  const origin = publicOrigin(request);
  const json = wantsJson(request);
  let accessToken = "";
  if ((request.headers.get("content-type") || "").includes("application/json")) {
    const body = (await request.json()) as { accessToken?: string };
    accessToken = String(body.accessToken || "").trim();
  } else {
    const form = await request.formData();
    accessToken = String(form.get("accessToken") || "").trim();
  }
  if (!accessToken) {
    if (json) return NextResponse.json({ error: "Paste a token first." }, { status: 400 });
    return NextResponse.redirect(`${origin}/connect/${provider}?error=missing_token`);
  }
  const tokenIssue = accessTokenIssue(provider as AppId, accessToken);
  if (tokenIssue) {
    if (json) return NextResponse.json({ error: tokenIssue }, { status: 400 });
    return NextResponse.redirect(`${origin}/connect/${provider}?error=${encodeURIComponent(tokenIssue)}`);
  }
  try {
    const verified = await verifyAccessToken(provider as AppId, accessToken);
    await saveConnection({
      provider: provider as AppId,
      accessToken,
      accountLabel: verified.accountLabel,
      meta: verified.meta,
      connectedAt: new Date().toISOString(),
    });
    if (json) return NextResponse.json({ ok: true, provider });
    return NextResponse.redirect(`${origin}/apps?connected=${provider}`, 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_token";
    if (json) return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.redirect(`${origin}/connect/${provider}?error=${encodeURIComponent(message)}`, 303);
  }
}
