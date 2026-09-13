import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { destroySession } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  await destroySession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  res.headers.set("cache-control", "private, no-store");
  return res;
}
