import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { resolveApproval } from "@/lib/trust/store";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const body = (await request.json()) as {
    id?: string;
    decision?: "approve" | "reject";
    actor?: string;
    note?: string;
  };
  if (!body.id || (body.decision !== "approve" && body.decision !== "reject")) {
    return NextResponse.json({ error: "id and decision are required" }, { status: 400 });
  }
  try {
    const result = await resolveApproval(body.id, body.decision, body.actor || "Maya Chen", body.note);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
