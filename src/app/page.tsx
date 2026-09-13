import { LandingFooter } from "@/components/landing-footer";
import { LandingHeader } from "@/components/landing-header";
import { ProductPreview } from "@/components/product-preview";
import { AppLogo } from "@/components/brand-logos";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Intercept the tool call",
    body: "Agents never talk to Gmail, Slack, Notion, or GitHub directly. They go through Aegis — SDK or MCP.",
  },
  {
    n: "02",
    title: "Minimize for the model",
    body: "Policy strips emails, phones, SSNs, and secrets from tool results so the model never sees them.",
  },
  {
    n: "03",
    title: "Allow, hold, or deny",
    body: "Safe reads proceed. Sensitive writes wait. Forbidden calls are blocked and hashed into the audit log.",
  },
];

const FEATURES = [
  {
    title: "Policy-based data minimization",
    body: "Redact, hash, or drop PII and secrets before tool output is allowed into the model context.",
  },
  {
    title: "MCP integration",
    body: "Point any MCP client at Aegis. The same Gmail / Slack / Notion / GitHub tools, with the trust layer in front.",
  },
  {
    title: "SDKs for AI applications",
    body: "TypeScript and Python clients wrap tool calls. One line to minimize a payload. One line to call a gated tool.",
  },
  {
    title: "Human in the loop",
    body: "Irreversible work still waits. Merges, mass mail, and public posts land in Approvals.",
  },
];

const CASES = [
  {
    title: "Security",
    body: "Stop an API key, SSN, or PAN from entering the prompt. Deny the leak, alert, log the attempt.",
  },
  {
    title: "AI applications",
    body: "Drop in the SDK. Your agent keeps its tools. Aegis sits in the middle and returns a minimized view.",
  },
  {
    title: "MCP servers",
    body: "Expose the same tools over MCP. Cursor, Claude, and custom agents call Aegis instead of the raw APIs.",
  },
  {
    title: "Compliance",
    body: "Prove which fields were redacted, who approved a hold, and that the hash chain is intact.",
  },
];

const APPS = [
  {
    name: "Gmail",
    slug: "gmail" as const,
    use: "Inbox reads are minimized. Drafts are allowed. Sends wait when the list or the copy is sensitive.",
  },
  {
    name: "Slack",
    slug: "slack" as const,
    use: "Channel posts go through policy. Customer identifiers in the thread never reach the model.",
  },
  {
    name: "Notion",
    slug: "notion" as const,
    use: "Runbooks can update. The policy hub cannot. Audit rows stay append-only.",
  },
  {
    name: "GitHub",
    slug: "github" as const,
    use: "Diffs are minimized for the reviewer agent. Merges wait for a person.",
  },
];

const SECURITY = [
  {
    title: "Data never hits the model raw",
    body: "Minimization runs on every tool result. Emails, phones, SSNs, cards, and keys are policy-controlled.",
  },
  {
    title: "Deterministic gate",
    body: "Allow / hold / deny is your policy pack, not a model improvising on production tools.",
  },
  {
    title: "MCP and SDK, same control plane",
    body: "Whether the caller is an MCP client or an in-process SDK, the intercept, the redaction, and the audit are identical.",
  },
  {
    title: "Tamper-evident log",
    body: "Each verdict is hashed with the previous entry. If a row is edited, the chain flags a break.",
  },
];

const FAQ = [
  {
    q: "Is this a chatbot?",
    a: "No. Aegis is the trust layer between AI agents and their tools. It intercepts tool calls, minimizes data before it reaches the model, and only then talks to Gmail, Slack, Notion, or GitHub.",
  },
  {
    q: "How does data minimization work?",
    a: "Each tool result is scanned for data classes (email, phone, SSN, PAN, API keys, IPs). Your policy pack says redact, hash, drop, or deny. The model receives the minimized view. The live API still sees what it needs to execute an allowed action.",
  },
  {
    q: "What is the MCP endpoint?",
    a: "POST /api/mcp is a JSON-RPC MCP server. List tools, call gmail.read / slack.post / notion.write / github.merge. Auth is a Bearer token or a signed-in session.",
  },
  {
    q: "How do I use the SDK?",
    a: "TypeScript: new Aegis({ baseUrl, apiKey }).minimize(text) or .callTool('gmail.read', args). Python is the same HTTP API. Snippets live on Integrations after you sign in.",
  },
  {
    q: "Can an agent change the rules?",
    a: "No. Rewriting the policy pack is denied by default and logged. Humans edit policies in the product.",
  },
  {
    q: "Who is this for?",
    a: "Teams shipping AI agents and AI applications that must use real tools without putting customer PII or secrets into the model context.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-full bg-[#f4f4f4] text-[#0c0c0c]">
      <div className="paper-page mx-auto min-h-full w-min max-w-[1340px] min-w-0" style={{ width: "min(100%, 1340px)" }}>
        <LandingHeader />

        <main>
          <section className="relative overflow-hidden border-b border-[#d9d9d9] pt-[71px] pb-16">
            <div className="relative z-10 mx-auto max-w-[1124px] px-5 text-center md:px-7">
              <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-dashed border-[#bdbdbd] px-3 py-1.5 text-[11px] font-medium tracking-[0.04em] uppercase">
                <ShieldCheck className="size-3.5" />
                The trust layer for AI agents
              </p>
              <h1 className="font-heading text-[54px] leading-[1.17] tracking-[-0.025em]">
                Let agents work.
                <br />
                Keep sensitive data off the model.
              </h1>
              <p className="mx-auto mt-3 max-w-[320px] text-[15px] leading-[1.45] text-[#0c0c0c]">
                Aegis sits between AI agents and their tools. Policy-based data minimization,
                MCP integration, and SDKs for AI applications — so PII and secrets never reach the model.
              </p>
              <div className="mt-[22px] flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                <a href="#product" className="agnost-btn-dark">
                  See the product <span className="text-[18px] leading-none">→</span>
                </a>
                <Link href="/signup" className="agnost-btn">
                  Get started
                </Link>
              </div>
            </div>
            <div className="relative mx-auto mt-16 w-full max-w-[600px] px-5 pb-10" id="product">
              <div className="relative">
                <span className="pointer-events-none absolute top-0 left-0 size-5 border-t-2 border-l-2 border-[#777]" />
                <span className="pointer-events-none absolute top-0 right-0 size-5 border-t-2 border-r-2 border-[#777]" />
                <span className="pointer-events-none absolute bottom-0 left-0 size-5 border-b-2 border-l-2 border-[#777]" />
                <span className="pointer-events-none absolute right-0 bottom-0 size-5 border-b-2 border-r-2 border-[#777]" />
                <div className="px-3 py-3">
                  <ProductPreview />
                </div>
              </div>
            </div>
          </section>

          <section className="border-b border-[#d9d9d9] py-8">
            <div className="mx-auto flex max-w-[1124px] flex-col items-center gap-6 px-5 md:flex-row md:justify-between">
              <p className="font-mono text-[10px] font-medium tracking-[0.08em] text-[#737373] uppercase">
                MCP · TypeScript SDK · Python SDK
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[14px] font-semibold tracking-[-0.04em] text-[#526057]">
                {APPS.map((app) => (
                  <span key={app.slug} className="inline-flex items-center gap-2">
                    <AppLogo app={app.slug} className="size-5" />
                    {app.name}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="scroll-mt-24 border-b border-[#d9d9d9] px-5 py-[100px]" id="how">
            <div className="mx-auto max-w-[1124px]">
              <p className="font-mono text-[10px] font-medium tracking-[0.08em] uppercase">How it works</p>
              <h2 className="mt-3 max-w-2xl text-[clamp(46px,6vw,72px)] leading-[0.98] font-medium tracking-[-0.075em]">
                One layer between your agents and the tools.
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#5f5f5f]">
                Aegis intercepts the call, minimizes what the model may see, then allows, holds, or denies. Same policy whether you connect over MCP or the SDK.
              </p>
              <div className="mt-12 grid border-t border-[#d9d9d9] md:grid-cols-3">
                {STEPS.map((step, i) => (
                  <article
                    key={step.n}
                    className={`min-h-[260px] py-5 pr-5 ${i ? "border-[#d9d9d9] md:border-l md:pl-5" : ""}`}
                  >
                    <p className="font-mono text-[10px] font-medium">{step.n}</p>
                    <h3 className="mt-16 max-w-[190px] text-[21px] tracking-[-0.06em]">{step.title}</h3>
                    <p className="mt-3.5 max-w-[230px] text-[13px] leading-relaxed text-[#444]">{step.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="border-b border-[#d9d9d9] px-5 py-[100px]" id="platform">
            <div className="mx-auto max-w-[1124px]">
              <p className="font-mono text-[10px] font-medium tracking-[0.08em] uppercase">Platform</p>
              <h2 className="mt-3 max-w-2xl text-[clamp(46px,6vw,72px)] leading-[0.98] font-medium tracking-[-0.075em]">
                Everything you need to put agents on tools — without putting customers in the prompt.
              </h2>
              <div className="mt-12 grid gap-3 md:grid-cols-2">
                {FEATURES.map((f) => (
                  <article key={f.title} className="dash-card p-7">
                    <h3 className="text-[28px] leading-tight font-medium tracking-[-0.06em]">{f.title}</h3>
                    <p className="mt-3 text-[14px] leading-relaxed text-[#5f5f5f]">{f.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="scroll-mt-24 border-b border-[#d9d9d9] px-5 py-[100px]" id="use-cases">
            <div className="mx-auto max-w-[1124px]">
              <p className="font-mono text-[10px] font-medium tracking-[0.08em] uppercase">Use cases</p>
              <h2 className="mt-3 max-w-2xl text-[clamp(46px,6vw,72px)] leading-[0.98] font-medium tracking-[-0.075em]">
                The work behind every tool call.
              </h2>
              <div className="mt-12 grid gap-3 sm:grid-cols-2">
                {CASES.map((item) => (
                  <article key={item.title} className="dash-card p-7">
                    <h3 className="text-[24px] tracking-[-0.05em]">{item.title}</h3>
                    <p className="mt-3 text-[14px] leading-relaxed text-[#5f5f5f]">{item.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="scroll-mt-24 border-b border-[#d9d9d9] px-5 py-[100px]" id="integrations">
            <div className="mx-auto max-w-[1124px]">
              <p className="font-mono text-[10px] font-medium tracking-[0.08em] uppercase">Integrations</p>
              <h2 className="mt-3 max-w-3xl text-[clamp(46px,6vw,72px)] leading-[0.98] font-medium tracking-[-0.075em]">
                MCP tools your agents already expect.
              </h2>
              <p className="mt-4 max-w-2xl text-[15px] text-[#5f5f5f]">
                OAuth for the live APIs. MCP and the SDK for the agents. Minimization for the model.
              </p>
              <div className="mt-12 grid sm:grid-cols-2">
                {APPS.map((app, i) => {
                  return (
                    <article
                      key={app.name}
                      className={`flex gap-4 border border-[#d9d9d9] p-6 ${i % 2 === 0 ? "sm:border-r-0" : ""} ${i < 2 ? "border-b-0" : ""}`}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center border border-dashed border-[#cfcfcf] bg-[#fafafa]">
                        <AppLogo app={app.slug} className="size-5" />
                      </span>
                      <div>
                        <h3 className="text-[22px] tracking-[-0.05em]">{app.name}</h3>
                        <p className="mt-2 text-[13px] leading-relaxed text-[#5f5f5f]">{app.use}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
              <Link href="/apps" className="mt-8 inline-flex items-center gap-2 text-[12px] font-semibold hover:underline hover:underline-offset-4">
                Connect your stack
                <span>→</span>
              </Link>
            </div>
          </section>

          <section className="scroll-mt-24 border-b border-[#d9d9d9] bg-[#0c0c0c] px-5 py-[100px] text-white" id="security">
            <div className="mx-auto max-w-[1124px]">
              <p className="font-mono text-[10px] font-medium tracking-[0.08em] uppercase">Security</p>
              <h2 className="mt-3 max-w-2xl text-[clamp(46px,6vw,72px)] leading-[0.98] font-medium tracking-[-0.075em]">
                Enterprise controls, without a six-month rollout.
              </h2>
              <div className="mt-10 grid gap-8 md:grid-cols-2">
                {SECURITY.map((item) => (
                  <article key={item.title}>
                    <h3 className="text-[16px] font-medium">{item.title}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-[#b0b0b0]">{item.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="scroll-mt-24 border-b border-[#d9d9d9] px-5 py-[100px]" id="faq">
            <div className="mx-auto grid max-w-[1124px] gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20">
              <div>
                <p className="mb-5 inline-block bg-[#111] px-2 py-1 font-mono text-[10px] font-medium tracking-[0.04em] text-white uppercase">
                  FAQ
                </p>
                <h2 className="text-[clamp(46px,5.2vw,76px)] leading-[0.98] font-medium tracking-[-0.075em]">
                  Questions,
                  <br />
                  <span className="text-[#858585]">answered.</span>
                </h2>
                <p className="mt-6 max-w-[410px] text-[15px] leading-relaxed text-[#5f5f5f]">
                  Everything you need to know before putting a trust layer in front of production agents.
                </p>
              </div>
              <div className="grid gap-2.5">
                {FAQ.map((item) => (
                  <details key={item.q} className="group dash-card min-h-[76px] open:border-[#111]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 text-left text-[18px] font-medium tracking-[-0.035em] marker:content-none">
                      {item.q}
                      <i className="shrink-0 text-[34px] leading-none font-light text-[#777] not-italic transition-transform group-open:rotate-45 group-open:text-[#9254ff]">
                        +
                      </i>
                    </summary>
                    <p className="mt-[-4px] mr-16 mb-6 ml-6 text-[14px] leading-relaxed text-[#5f5f5f]">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <section className="px-5 py-[100px]">
            <div className="mx-auto max-w-[1124px]">
              <h2 className="max-w-xl text-[clamp(46px,6vw,72px)] leading-[0.98] font-medium tracking-[-0.075em]">
                Sit Aegis between your agents and their tools.
              </h2>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-[#5f5f5f]">
                Create an account, then run the simulator. You will see the intercept, the redaction, and the verdict — then wire MCP or the SDK from Integrations.
              </p>
              <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
                <Link href="/signup" className="agnost-btn-dark">
                  Get started <span className="text-[18px] leading-none">→</span>
                </Link>
                <Link href="/signin" className="agnost-btn">
                  Sign in
                </Link>
              </div>
            </div>
          </section>
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
