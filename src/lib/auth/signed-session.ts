import { createHmac, timingSafeEqual } from "crypto";

export type SessionUser = { id: string; name: string; email: string };

const TTL_MS = 1000 * 60 * 60 * 24 * 30;
export const SIGNED_SESSION_PREFIX = "v1.";

function sessionSecret() {
  return (
    process.env.SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    "aegis-demo-session-v1-not-a-production-secret"
  );
}

function hmacHex(data: string) {
  return createHmac("sha256", sessionSecret()).update(data).digest("hex");
}

function equalHex(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== 32 || right.length !== 32) return false;
  return timingSafeEqual(left, right);
}

export function isSignedSessionToken(token: string) {
  return token.startsWith(SIGNED_SESSION_PREFIX);
}

export function signSession(user: SessionUser, now = Date.now()): { token: string; expiresAt: string } {
  const exp = now + TTL_MS;
  const body = Buffer.from(
    JSON.stringify({ id: user.id, name: user.name, email: user.email, exp }),
    "utf8"
  ).toString("base64url");
  const token = `${SIGNED_SESSION_PREFIX}${body}.${hmacHex(body)}`;
  return { token, expiresAt: new Date(exp).toISOString() };
}

export function verifySession(token: string | undefined | null, now = Date.now()): SessionUser | null {
  if (!token || !isSignedSessionToken(token)) return null;
  const rest = token.slice(SIGNED_SESSION_PREFIX.length);
  const dot = rest.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = rest.slice(0, dot);
  const sig = rest.slice(dot + 1);
  if (!/^[0-9a-f]{64}$/.test(sig)) return null;
  if (!equalHex(sig, hmacHex(body))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      id?: unknown;
      name?: unknown;
      email?: unknown;
      exp?: unknown;
    };
    if (typeof parsed.id !== "string" || typeof parsed.name !== "string" || typeof parsed.email !== "string") {
      return null;
    }
    if (typeof parsed.exp !== "number" || parsed.exp <= now) return null;
    return { id: parsed.id, name: parsed.name, email: parsed.email };
  } catch {
    return null;
  }
}
