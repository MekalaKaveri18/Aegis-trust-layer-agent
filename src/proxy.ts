import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { isSignedSessionToken, verifySession } from "@/lib/auth/signed-session";

const PROTECTED = [
  "/command",
  "/agent",
  "/eval",
  "/approvals",
  "/audit",
  "/policies",
  "/apps",
  "/playground",
  "/connect",
];

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0];
  const port = host.includes(":") ? host.split(":")[1] : url.port || "43147";
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    (process.env.APP_BASE_URL?.startsWith("http://") ? "http" : "https");
  url.protocol = proto === "https" ? "https:" : "http:";
  if (hostname === "0.0.0.0" || hostname === "[::]" || hostname === "") {
    url.hostname = "127.0.0.1";
    url.port = port || "43147";
    return NextResponse.redirect(url);
  }
  url.hostname = hostname;
  if (port) url.port = port;

  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!needsAuth) return NextResponse.next();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const signedOk = Boolean(token && verifySession(token));
  const legacyOk = Boolean(token && !isSignedSessionToken(token));
  if (signedOk || legacyOk) return NextResponse.next();
  url.pathname = "/signin";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/command/:path*",
    "/command",
    "/agent/:path*",
    "/agent",
    "/eval/:path*",
    "/eval",
    "/approvals/:path*",
    "/approvals",
    "/audit/:path*",
    "/audit",
    "/policies/:path*",
    "/policies",
    "/apps/:path*",
    "/apps",
    "/playground/:path*",
    "/playground",
    "/connect/:path*",
  ],
};
