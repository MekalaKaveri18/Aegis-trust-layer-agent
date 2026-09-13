import { NextResponse } from "next/server";
import { createUser, createSession } from "@/lib/auth/store";
import { attachSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; email?: string; password?: string };
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  if (name.length < 2) {
    return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  try {
    const user = await createUser({ name, email, password });
    const session = await createSession(user);
    return attachSessionCookie(NextResponse.json({ ok: true, user }), session, request);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not sign up" }, { status: 400 });
  }
}
