import { NextResponse } from "next/server";
import { corsHeaders, requireSdkAuth } from "@/lib/auth/sdk";
import { callMcpTool, listMcpTools } from "@/lib/mcp/server";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request) {
  const auth = await requireSdkAuth(request);
  if (auth.error) {
    const res = auth.error;
    for (const [k, v] of Object.entries(corsHeaders())) res.headers.set(k, v);
    return res;
  }
  return NextResponse.json({ tools: listMcpTools() }, { headers: corsHeaders() });
}

export async function POST(request: Request) {
  const auth = await requireSdkAuth(request);
  if (auth.error) {
    const res = auth.error;
    for (const [k, v] of Object.entries(corsHeaders())) res.headers.set(k, v);
    return res;
  }
  const body = (await request.json()) as { name?: string; arguments?: Record<string, unknown> };
  if (!body.name) {
    return NextResponse.json({ error: "Provide a tool name." }, { status: 400, headers: corsHeaders() });
  }
  try {
    const result = await callMcpTool(body.name, body.arguments ?? {});
    return NextResponse.json(result, { headers: corsHeaders() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Tool call failed" },
      { status: 400, headers: corsHeaders() }
    );
  }
}
