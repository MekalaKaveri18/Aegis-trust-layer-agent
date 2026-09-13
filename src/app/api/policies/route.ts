import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { updatePolicy } from "@/lib/trust/store";
import type { VerdictDecision } from "@/lib/trust/types";

export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const body = (await request.json()) as {
    id?: string;
    enabled?: boolean;
    decision?: VerdictDecision;
  };
  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  try {
    const state = await updatePolicy(body.id, { enabled: body.enabled, decision: body.decision });
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
