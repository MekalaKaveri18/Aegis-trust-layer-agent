# Aegis

**The trust layer for AI agents.** It sits between agents and their tools so sensitive data never reaches the model.

Policy-based data minimization. MCP integration. SDKs for AI applications. Agents never call Gmail, Slack, Notion, or GitHub directly.

<video src="docs/aegis-demo.mp4" width="100%" controls playsinline></video>

![Aegis product demo](docs/aegis-demo.mp4)

The file is `docs/aegis-demo.mp4` in this repo

## Live on Vercel

**https://withaegis.vercel.app**

Local preview stays **http://127.0.0.1:43147**.

## What this is

```
AI app / agent  →  Aegis SDK or MCP  →  minimize + policy  →  tools
                      ↑
              what the model sees is redacted
```

1. **Intercept** every tool call (MCP or SDK).
2. **Minimize** emails, phones, SSNs, cards, and secrets before the result is allowed into the model context.
3. **Allow, hold, or deny** the call itself. Holds wait for a person. Denials are logged. Allowed calls hit the live APIs — or fail closed if the app is disconnected.

## MCP

`POST /api/mcp` is a JSON-RPC MCP server.

```bash
curl -X POST "$ORIGIN/api/mcp" \
  -H "Authorization: Bearer aegis_demo_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Tools: `gmail.read`, `gmail.send`, `slack.post`, `notion.write`, `github.merge`.

## SDK

TypeScript client: `src/lib/sdk/aegis.ts`

```ts
const aegis = new Aegis({ baseUrl: ORIGIN, apiKey: "aegis_demo_key" });
const safe = await aegis.minimize(toolResult); // send safe.forModel to the LLM
await aegis.callTool("gmail.read", { summary: "Read unread threads" });
```

HTTP: `POST /api/v1/minimize` and `POST /api/v1/tools`. Default demo key is `aegis_demo_key`. Override with `AEGIS_API_KEY`.

## Why it is useful

Without this layer, tool output goes straight into the prompt: SSNs from the inbox, API keys in a ticket, customer emails in a Slack thread. Aegis makes the default path **minimized**: the model sees `[EMAIL]`, `[SSN]`, `[API_KEY]`. The live API still receives what it needs to execute an allowed action.

The gate still holds mass mail and merges, and still denies injection and secret exfiltration.

## Product tour

| Surface | What you see |
| --- | --- |
| Landing | Trust layer, minimization, MCP, SDKs |
| Overview | MCP tools, intercepts, redactions, holds |
| Agent | Weekly ops and support triage through the gate |
| Simulator | Allow / deny / hold plus **what the model sees** |
| Integrations | MCP endpoint, SDK snippets, OAuth for the four tools |
| Policies | Priority pack including redact-PII and hash-IP |
| Audit | Hash-chained decisions |
| Eval | Policy battery plus minimization battery |

## Run it locally

You need **Node 20+**. Do not use `0.0.0.0` in the browser.

```bash
git clone https://github.com/MekalaKaveri18/Aegis-trust-layer-agent.git
cd Aegis-trust-layer-agent
cp .env.example .env.local
npm install
npm run build
npm run start
```

Open **[http://127.0.0.1:43147](http://127.0.0.1:43147)**.

On **Get started**, create an account with your name, work email, and password. Creating an account signs you in and opens the product. There is no guest or one-click demo login.

```bash
npm test    # policy battery, minimization, injection, weekly plan
```

## Connect Gmail, Slack, Notion, and GitHub

OAuth is not mocked. In the app go to **Integrations** → **Connect**.

| App | Redirect URI | Notes |
| --- | --- | --- |
| Gmail | `{APP_BASE_URL}/api/oauth/gmail/callback` | Google Cloud **Web** OAuth client. Enable Gmail API. |
| Slack | `{APP_BASE_URL}/api/oauth/slack/callback` | Bot scopes: `chat:write`, `channels:read`, `channels:join`, `groups:read`, `im:write`. |
| Notion | `{APP_BASE_URL}/api/oauth/notion/callback` | Public integration, or an Internal secret. **Share the page**. |
| GitHub | `{APP_BASE_URL}/api/oauth/github/callback` | OAuth App, `repo` scope — or a PAT. |

Until an app is connected, the trust engine still minimizes, allows, holds, and denies. Execution against that API fails honestly.

## Try it in two minutes

1. Open the app → **Get started** → create an account.
2. **Simulator** → **Inbox with PII** (allow, redacted) → **Leak an API key** (deny).
3. **Integrations** → copy the MCP URL or SDK snippet.
4. **Eval** → confirm the policy battery and the minimization battery.

## Stack

Next.js, TypeScript, Tailwind, the Aegis trust engine in `src/lib/trust/`, MCP in `src/lib/mcp/`, SDK in `src/lib/sdk/`.
