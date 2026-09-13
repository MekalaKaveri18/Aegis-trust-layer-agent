import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { intercept } from "@/lib/trust/store";
import type { ProposedAction } from "@/lib/trust/types";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const body = (await request.json()) as ProposedAction & { dryRun?: boolean };
  if (!body?.agentId || !body.app || !body.action || !body.summary) {
    return NextResponse.json({ error: "agentId, app, action, and summary are required" }, { status: 400 });
  }
  const result = await intercept({
    agentId: body.agentId,
    app: body.app,
    action: body.action,
    summary: body.summary,
    payload: body.payload ?? {},
    dryRun: Boolean(body.dryRun),
  });
  return NextResponse.json(result);
}
