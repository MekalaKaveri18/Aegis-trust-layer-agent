"use client";

import { PageHeader, Panel, PanelTitle, ProductBody } from "@/components/page-header";
import { useAegis } from "@/components/state-provider";
import { AppLogo } from "@/components/brand-logos";
import { ConnectorMark } from "@/components/status";
import { explainOAuthError } from "@/lib/oauth/validate";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SdkSnippet({ origin }: { origin: string }) {
  const ts = `import { Aegis } from "./aegis";

const aegis = new Aegis({
  baseUrl: "${origin}",
  apiKey: "aegis_demo_key",
});

const safe = await aegis.minimize(toolResult);
// send safe.forModel to the LLM — never the raw toolResult

const call = await aegis.callTool("gmail.read", {
  summary: "Read unread support threads",
});`;

  const py = `import requests

base = "${origin}"
headers = {"Authorization": "Bearer aegis_demo_key", "Content-Type": "application/json"}

safe = requests.post(f"{base}/api/v1/minimize", headers=headers, json={"text": tool_result}).json()
# send safe["forModel"] to the model

mcp = requests.post(f"{base}/api/mcp", headers=headers, json={
  "jsonrpc": "2.0", "id": 1, "method": "tools/call",
  "params": {"name": "gmail.read", "arguments": {"summary": "Read unread threads"}},
}).json()`;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div>
        <p className="px-4 pt-3 font-mono text-[10px] tracking-[0.08em] text-[#8a8a8a] uppercase">TypeScript SDK</p>
        <pre className="max-h-64 overflow-auto px-4 py-3 font-mono text-[11px] leading-relaxed text-[#333]">{ts}</pre>
      </div>
      <div>
        <p className="px-4 pt-3 font-mono text-[10px] tracking-[0.08em] text-[#8a8a8a] uppercase">Python · MCP</p>
        <pre className="max-h-64 overflow-auto px-4 py-3 font-mono text-[11px] leading-relaxed text-[#333]">{py}</pre>
      </div>
    </div>
  );
}

function AppsInner() {
  const { state } = useAegis();
  const params = useSearchParams();
  const error = params.get("error");
  const connected = params.get("connected");
  const disconnected = params.get("disconnected");
  const [origin, setOrigin] = useState("https://your-aegis.host");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="MCP and SDKs in front. OAuth behind. Tool results are minimized before they reach the model."
      />
      <ProductBody className="space-y-4">
      {error || connected || disconnected ? (
        <p className="text-[13px] text-[#555]">
          {error
            ? `Couldn’t connect: ${explainOAuthError(error) || error}`
            : connected
              ? `${connected} is connected.`
              : `${disconnected} was disconnected.`}
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel>
          <PanelTitle>MCP endpoint</PanelTitle>
          <div className="space-y-2 px-4 py-3 text-[13px] leading-relaxed text-[#5f5f5f]">
            <p>
              Point an MCP client at this host. Same tools, same policy pack, minimized responses.
            </p>
            <p className="font-mono text-[12px] text-[#0c0c0c]">{origin}/api/mcp</p>
            <p className="font-mono text-[11px] text-[#8a8a8a]">Authorization: Bearer aegis_demo_key</p>
            <p className="font-mono text-[11px] text-[#8a8a8a]">
              tools · gmail.read · gmail.send · slack.post · notion.write · github.merge
            </p>
          </div>
        </Panel>
        <Panel>
          <PanelTitle>SDK for AI applications</PanelTitle>
          <div className="space-y-2 px-4 py-3 text-[13px] leading-relaxed text-[#5f5f5f]">
            <p>
              Wrap every tool call. <span className="text-[#0c0c0c]">minimize()</span> strips PII.
              <span className="text-[#0c0c0c]"> callTool()</span> runs the trust layer.
            </p>
            <p className="font-mono text-[12px] text-[#0c0c0c]">POST {origin}/api/v1/minimize</p>
            <p className="font-mono text-[12px] text-[#0c0c0c]">POST {origin}/api/v1/tools</p>
            <p>
              Client lives at <span className="font-mono text-[12px] text-[#0c0c0c]">src/lib/sdk/aegis.ts</span>.
            </p>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelTitle>Drop-in snippets</PanelTitle>
        <SdkSnippet origin={origin} />
      </Panel>

      <Panel>
        <ul>
          {state.apps.map((app) => {
            const live = app.status === "connected";
            return (
              <li
                key={app.id}
                className="flex flex-col gap-3 border-b border-[#ececec] px-4 py-4 last:border-0 sm:flex-row sm:items-center"
              >
                <span className="flex size-9 items-center justify-center rounded-md border border-dashed border-[#cfcfcf] bg-white">
                  <AppLogo app={app.id} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">
                    {app.name}
                    <span className="ml-2.5 inline-flex align-middle">
                      <ConnectorMark healthy={live} />
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-[#737373]">
                    {app.accountLabel || app.description}
                  </p>
                </div>
                {live ? (
                  <form action={`/api/oauth/${app.id}/disconnect`} method="post">
                    <button type="submit" className="btn-quiet">
                      Unbind
                    </button>
                  </form>
                ) : (
                  <a href={`/connect/${app.id}`} className="btn-primary">
                    Connect
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
      </ProductBody>
    </div>
  );
}

export default function AppsPage() {
  return (
    <Suspense fallback={<p className="text-[13px] text-[#737373]">Loading…</p>}>
      <AppsInner />
    </Suspense>
  );
}
