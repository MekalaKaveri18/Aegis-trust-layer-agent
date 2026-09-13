import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { latestRun } from "@/lib/agent/runs";
import { gateEvalSummary, minimizeEvalSummary } from "@/lib/trust/eval-cases";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const gates = gateEvalSummary();
  const minimize = minimizeEvalSummary();
  const run = await latestRun();
  return NextResponse.json({
    gates,
    minimize,
    lastAgentRun: run
      ? {
          id: run.id,
          status: run.status,
          eval: run.eval,
          githubNote: run.observation.githubNote,
          note: run.observation.note,
        }
      : null,
  });
}
