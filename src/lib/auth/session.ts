import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieSecure } from "./constants";
import { destroySession, userFromToken, type PublicUser } from "./store";

export { SESSION_COOKIE };

export function attachSessionCookie(
  response: NextResponse,
  session: { token: string; expiresAt: string },
  request: Request
) {
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(session.expiresAt),
    maxAge: Math.max(0, Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000)),
    secure: sessionCookieSecure(request),
  });
  response.headers.set("cache-control", "private, no-store");
  return response;
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  return userFromToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requireApiUser(): Promise<
  { user: PublicUser; error?: undefined } | { user?: undefined; error: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  }
  return { user };
}

export async function clearSessionCookie() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  await destroySession(token);
  jar.delete(SESSION_COOKIE);
}
