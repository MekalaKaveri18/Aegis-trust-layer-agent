import { NextResponse } from "next/server";
import type { AppId } from "@/lib/trust/types";
import { deleteConnection } from "@/lib/oauth/connections";
import { publicOrigin } from "@/lib/oauth/config";

const PROVIDERS: AppId[] = ["gmail", "slack", "notion", "github"];

export async function POST(_request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!PROVIDERS.includes(provider as AppId)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }
  await deleteConnection(provider as AppId);
  return NextResponse.redirect(`${publicOrigin(_request)}/apps?disconnected=${provider}`, 303);
}
