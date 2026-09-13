import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { resetStore } from "@/lib/trust/store";

export async function POST() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const state = await resetStore();
  return NextResponse.json(state);
}
