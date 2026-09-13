import { NextResponse } from "next/server";
import { authenticate, createSession } from "@/lib/auth/store";
import { attachSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  try {
    const user = await authenticate(email, password);
    const session = await createSession(user);
    return attachSessionCookie(NextResponse.json({ ok: true, user }), session, request);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not sign in" }, { status: 401 });
  }
}
