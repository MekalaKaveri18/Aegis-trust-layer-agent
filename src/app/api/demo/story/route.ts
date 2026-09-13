import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { getPublicState, intercept } from "@/lib/trust/store";
import { CONTROL_STORY, SCENARIOS } from "@/lib/trust/scenarios";

export async function POST() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const beats = [];
  for (const beat of CONTROL_STORY) {
    const proposed = SCENARIOS[beat.id];
    const result = await intercept(proposed);
    beats.push({
      id: beat.id,
      title: beat.title,
      hint: beat.hint,
      record: result.record,
      events: result.events,
    });
  }
  return NextResponse.json({
    beats,
    state: await getPublicState(),
  });
}
