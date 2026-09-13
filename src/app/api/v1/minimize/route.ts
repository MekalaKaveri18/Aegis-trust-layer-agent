import { NextResponse } from "next/server";
import { corsHeaders, requireSdkAuth } from "@/lib/auth/sdk";
import { minimizeText } from "@/lib/trust/minimize";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  const auth = await requireSdkAuth(request);
  if (auth.error) {
    const res = auth.error;
    for (const [k, v] of Object.entries(corsHeaders())) res.headers.set(k, v);
    return res;
  }
  const body = (await request.json()) as { text?: string };
  const text = body.text ?? "";
  if (!text.trim()) {
    return NextResponse.json({ error: "Provide text to minimize." }, { status: 400, headers: corsHeaders() });
  }
  return NextResponse.json(minimizeText(text), { headers: corsHeaders() });
}
