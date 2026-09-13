import { NextResponse } from "next/server";
import { intercept } from "@/lib/trust/store";
import { requireApiUser } from "@/lib/auth/session";
import { SCENARIOS } from "@/lib/trust/scenarios";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { scenario } = (await request.json()) as { scenario?: string };
  const proposed = scenario ? SCENARIOS[scenario] : undefined;
  if (!proposed) {
    return NextResponse.json({ error: "Unknown scenario", scenarios: Object.keys(SCENARIOS) }, { status: 400 });
  }
  const result = await intercept(proposed);
  return NextResponse.json({ scenario, ...result });
}

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  return NextResponse.json({
    scenarios: Object.entries(SCENARIOS).map(([id, action]) => ({
      id,
      label: action.summary,
      app: action.app,
      agentId: action.agentId,
      action: action.action,
    })),
  });
}
