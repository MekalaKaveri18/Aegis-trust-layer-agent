import { NextResponse } from "next/server";
import { corsHeaders, requireSdkAuth } from "@/lib/auth/sdk";
import { handleMcpRpc, listMcpTools } from "@/lib/mcp/server";

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
  return NextResponse.json(
    {
      protocol: "mcp",
      endpoint: "/api/mcp",
      tools: listMcpTools().map((t) => t.name),
      auth: "Bearer aegis_demo_key or a signed-in session",
    },
    { headers: corsHeaders() }
  );
}

export async function POST(request: Request) {
  const auth = await requireSdkAuth(request);
  if (auth.error) {
    const res = auth.error;
    for (const [k, v] of Object.entries(corsHeaders())) res.headers.set(k, v);
    return res;
  }
  const body = (await request.json()) as {
    jsonrpc?: string;
    id?: string | number | null;
    method?: string;
    params?: Record<string, unknown>;
  };
  const rpc = await handleMcpRpc(body);
  return NextResponse.json(rpc, { headers: corsHeaders() });
}
