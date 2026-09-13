"use client";

import { AppLogo } from "@/components/brand-logos";
import { AppPill, DecisionBadge, RiskBadge } from "@/components/badges";
import { MinimizeDiff } from "@/components/minimize-diff";
import { Pipeline } from "@/components/pipeline";
import { PageHeader, Panel, PanelTitle, ProductBody } from "@/components/page-header";
import { useAegis } from "@/components/state-provider";
import { simulate, submitIntercept } from "@/lib/client";
import type { AgentAction, AppId, InterceptRecord, ProposedAction } from "@/lib/trust/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useMemo, useState } from "react";

const SCENARIOS = [
  { id: "gmail-read", app: "gmail" as const, label: "Read inbox", detail: "Safe read. PII is redacted for the model." },
  { id: "gmail-pii", app: "gmail" as const, label: "Inbox with PII", detail: "SSN and email stripped before the model." },
  { id: "gmail-draft", app: "gmail" as const, label: "Draft a reply", detail: "Creates a draft, no send." },
  { id: "gmail-mass-send", app: "gmail" as const, label: "Bulk outreach", detail: "Holds for a human." },
  { id: "gmail-secrets", app: "gmail" as const, label: "Leak an API key", detail: "Denied. Key never reaches the model." },
  { id: "slack-support", app: "slack" as const, label: "Post to #support", detail: "Allowed for support agent." },
  { id: "slack-general", app: "slack" as const, label: "Post to #general", detail: "Public channel, held." },
  { id: "notion-runbook", app: "notion" as const, label: "Update a runbook", detail: "Ops write, allowed." },
  { id: "notion-policy", app: "notion" as const, label: "Rewrite a policy", detail: "Denied. Humans only." },
  { id: "github-merge", app: "github" as const, label: "Merge a pull request", detail: "Always held." },
  { id: "github-unauthorized", app: "github" as const, label: "Unauthorized merge", detail: "Wrong agent, denied." },
];

const ACTIONS: Record<AppId, AgentAction[]> = {
  gmail: ["read", "draft", "send"],
  slack: ["post", "alert"],
  notion: ["read", "write", "append"],
  github: ["read", "comment", "merge"],
};

export default function PlaygroundPage() {
  const { state, setState } = useAegis();
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<InterceptRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [agentId, setAgentId] = useState("outreach-bot");
  const [app, setApp] = useState<AppId>("gmail");
  const [action, setAction] = useState<AgentAction>("send");
  const [summary, setSummary] = useState("Send a follow-up to a short customer list");
  const [to, setTo] = useState("casey@gmail.com, jordan@gmail.com");
  const [subject, setSubject] = useState("Quick check-in");
  const [body, setBody] = useState("Wanted to follow up on last week’s demo.");
  const [channel, setChannel] = useState("#general");
  const [database, setDatabase] = useState("Policies");
  const [repo, setRepo] = useState("acme/billing-api");
  const [prNumber, setPrNumber] = useState("512");

  const actions = useMemo(() => ACTIONS[app], [app]);

  async function runCustom() {
    setBusy(true);
    setNotice("Submitting to the trust layer…");
    try {
      const proposed: ProposedAction = {
        agentId,
        app,
        action,
        summary,
        payload: {
          to: to
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          subject,
          body,
          channel,
          database,
          content: body,
          repo,
          prNumber: Number(prNumber) || undefined,
        },
      };
      const result = await submitIntercept(proposed);
      setLast(result.record);
      setState(result.state);
      setNotice(`Verdict: ${result.record.verdict.decision.replace("_", " ")}`);
      toast.message(`Verdict: ${result.record.verdict.decision.replace("_", " ")}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Intercept failed";
      setNotice(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function runScenario(id: string) {
    setBusy(true);
    setNotice("Running scenario…");
    try {
      const result = await simulate(id);
      setLast(result.record);
      setState(result.state);
      setNotice(`Verdict: ${result.record.verdict.decision.replace("_", " ")}`);
      toast.message(`Verdict: ${result.record.verdict.decision.replace("_", " ")}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Simulation failed";
      setNotice(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Simulator"
        description="Propose a tool call as an agent would over MCP or the SDK. Aegis minimizes the payload, then allows, holds, or denies."
      />
      <ProductBody className="space-y-5">

      <div className="flex flex-wrap gap-1.5">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={busy}
            onClick={() => void runScenario(s.id)}
            className="btn-quiet h-7 gap-1.5"
          >
            <AppLogo app={s.app} className="size-3.5" />
            {s.label}
          </button>
        ))}
      </div>
      {notice ? <p className="text-[13px] text-[#5f5f5f]">{notice}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelTitle>Custom action</PanelTitle>
          <form
            className="space-y-3 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void runCustom();
            }}
          >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Agent">
              <Select
                value={agentId}
                items={Object.fromEntries(state.agents.map((a) => [a.id, a.name]))}
                onValueChange={(v: string | null) => {
                  if (v) setAgentId(v);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="App">
              <Select
                value={app}
                onValueChange={(v: string | null) => {
                  if (!v) return;
                  const next = v as AppId;
                  setApp(next);
                  setAction(ACTIONS[next][0]);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail">
                    <span className="inline-flex items-center gap-2">
                      <AppLogo app="gmail" className="size-4" /> Gmail
                    </span>
                  </SelectItem>
                  <SelectItem value="slack">
                    <span className="inline-flex items-center gap-2">
                      <AppLogo app="slack" className="size-4" /> Slack
                    </span>
                  </SelectItem>
                  <SelectItem value="notion">
                    <span className="inline-flex items-center gap-2">
                      <AppLogo app="notion" className="size-4" /> Notion
                    </span>
                  </SelectItem>
                  <SelectItem value="github">
                    <span className="inline-flex items-center gap-2">
                      <AppLogo app="github" className="size-4" /> GitHub
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Action">
              <Select
                value={action}
                onValueChange={(v: string | null) => {
                  if (v) setAction(v as AgentAction);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Summary">
              <Input value={summary} onChange={(e) => setSummary(e.target.value)} />
            </Field>
          </div>
          {app === "gmail" ? (
            <>
              <Field label="To (comma-separated)">
                <Input value={to} onChange={(e) => setTo(e.target.value)} />
              </Field>
              <Field label="Subject">
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </Field>
            </>
          ) : null}
          {app === "slack" ? (
            <Field label="Channel">
              <Input value={channel} onChange={(e) => setChannel(e.target.value)} />
            </Field>
          ) : null}
          {app === "notion" ? (
            <Field label="Database">
              <Input value={database} onChange={(e) => setDatabase(e.target.value)} />
            </Field>
          ) : null}
          {app === "github" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Repo">
                <Input value={repo} onChange={(e) => setRepo(e.target.value)} />
              </Field>
              <Field label="PR number">
                <Input value={prNumber} onChange={(e) => setPrNumber(e.target.value)} />
              </Field>
            </div>
          ) : null}
          <Field label="Body / content">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
          </Field>
          <Button type="submit" disabled={busy}>
            Submit
          </Button>
          </form>
        </Panel>

        <Panel>
          <PanelTitle>Verdict</PanelTitle>
          <div className="p-4">
          {last ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <AppPill app={last.app} />
                <RiskBadge level={last.verdict.riskLevel} />
                <DecisionBadge decision={last.verdict.decision} />
                <span className="font-mono text-xs text-[#8a8a8a]">score {last.verdict.riskScore}</span>
              </div>
              <p className="text-[13px]">{last.summary}</p>
              <Pipeline steps={last.verdict.steps} />
              {last.verdict.minimization ? (
                <MinimizeDiff result={last.verdict.minimization} />
              ) : null}
            </div>
          ) : (
            <p className="text-[13px] text-[#737373]">
              Run a template or submit a custom action. You will see the verdict and what the model is allowed to see.
            </p>
          )}
          </div>
        </Panel>
      </div>
      </ProductBody>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
