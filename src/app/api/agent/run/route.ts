import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { runSupportCopilot } from "@/lib/agent/run";
import { runWeeklyOps } from "@/lib/agent/weekly-run";
import { latestRun } from "@/lib/agent/runs";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const run = await latestRun();
  return NextResponse.json({ run });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  let goal = "";
  let job: "triage" | "weekly" = "triage";
  let dryRun = false;
  try {
    const body = (await request.json()) as { goal?: string; job?: string; dryRun?: boolean };
    goal = body.goal ?? "";
    if (body.job === "weekly") job = "weekly";
    dryRun = Boolean(body.dryRun);
  } catch {
    goal = "";
  }
  const run = job === "weekly" ? await runWeeklyOps({ goal, dryRun }) : await runSupportCopilot(goal);
  return NextResponse.json({ run });
}
