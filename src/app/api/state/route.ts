import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { getPublicState } from "@/lib/trust/store";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const state = await getPublicState();
  return NextResponse.json(state);
}
