import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { DEMO_USER } from "@/lib/auth/constants";
import type { PublicUser } from "@/lib/auth/store";

const DEMO_KEY = "aegis_demo_key";

export async function requireSdkAuth(request: Request): Promise<
  { user: PublicUser; error?: undefined } | { user?: undefined; error: NextResponse }
> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const expected = process.env.AEGIS_API_KEY || DEMO_KEY;
  if (token && token === expected) {
    return { user: { id: DEMO_USER.id, name: DEMO_USER.name, email: DEMO_USER.email } };
  }
  return requireApiUser();
}

export function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
  };
}
