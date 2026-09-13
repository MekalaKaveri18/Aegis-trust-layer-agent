import { NextResponse } from "next/server";
import type { AppId } from "@/lib/trust/types";
import { saveOAuthClient } from "@/lib/oauth/clients";
import { publicOrigin } from "@/lib/oauth/config";
import { oauthClientIssue } from "@/lib/oauth/validate";

const PROVIDERS: AppId[] = ["gmail", "slack", "notion", "github"];

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!PROVIDERS.includes(provider as AppId)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }
  const origin = publicOrigin(request);
  const form = await request.formData();
  const clientId = String(form.get("clientId") || "");
  const clientSecret = String(form.get("clientSecret") || "");
  const issue = oauthClientIssue(provider as AppId, clientId, clientSecret);
  if (issue) {
    return NextResponse.redirect(`${origin}/connect/${provider}?error=${encodeURIComponent(issue)}`);
  }
  await saveOAuthClient(provider as AppId, { clientId, clientSecret });
  return NextResponse.redirect(`${origin}/api/oauth/${provider}`, 303);
}
