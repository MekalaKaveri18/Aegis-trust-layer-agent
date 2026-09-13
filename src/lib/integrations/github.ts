import { randomUUID } from "crypto";
import type { IntegrationEvent, InterceptRecord } from "../trust/types";
import { missingConnectionEvent, requireConn } from "./util";

export type GithubPull = { repo: string; prNumber: number; title: string };

export async function runGithub(record: InterceptRecord): Promise<IntegrationEvent> {
  const conn = await requireConn("github");
  if (!conn) {
    return missingConnectionEvent("github", "github_skipped", "GitHub is not connected. Connect it on the Apps page.");
  }

  const headers = {
    Authorization: `Bearer ${conn.accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "aegis-trust-layer",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const repo = record.payload.repo;
  const pr = record.payload.prNumber;

  try {
    if (record.action === "read" && !repo) {
      const pulls = await listOpenPulls(headers);
      return {
        ...ok(
          "pr_list",
          pulls.length ? `Listed ${pulls.length} open pull request(s)` : "No open pull requests on connected repos",
          ""
        ),
        data: { pulls },
      };
    }

    if (!repo || !pr) {
      return {
        id: randomUUID(),
        app: "github",
        at: new Date().toISOString(),
        kind: "github_error",
        summary: "Missing repo or pull request number.",
        detail: "",
        ok: false,
      };
    }

    if (record.action === "read") {
      const res = await fetch(`https://api.github.com/repos/${repo}/pulls/${pr}`, { headers });
      if (!res.ok) throw new Error(`GitHub read failed (${res.status})`);
      return ok("pr_read", `Read ${repo}#${pr}`, String(pr), `https://github.com/${repo}/pull/${pr}`);
    }

    if (record.action === "comment") {
      const res = await fetch(`https://api.github.com/repos/${repo}/issues/${pr}/comments`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ body: record.payload.content || record.summary }),
      });
      const json = (await res.json()) as { id?: number; message?: string };
      if (!res.ok) throw new Error(json.message || `GitHub comment failed (${res.status})`);
      return ok("pr_comment", `Commented on ${repo}#${pr}`, String(json.id ?? ""), `https://github.com/${repo}/pull/${pr}`);
    }

    const res = await fetch(`https://api.github.com/repos/${repo}/pulls/${pr}/merge`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        commit_title: `Aegis merge: ${record.payload.prTitle ?? repo}`,
        merge_method: "merge",
      }),
    });
    const json = (await res.json()) as { merged?: boolean; message?: string; sha?: string };
    if (!res.ok) throw new Error(json.message || `GitHub merge failed (${res.status})`);
    return ok("pr_merged", `Merged ${repo}#${pr} after approval`, json.sha ?? "", `https://github.com/${repo}/pull/${pr}`);
  } catch (error) {
    return {
      id: randomUUID(),
      app: "github",
      at: new Date().toISOString(),
      kind: "github_error",
      summary: error instanceof Error ? error.message : "GitHub API error",
      detail: "",
      ok: false,
    };
  }
}

async function listOpenPulls(headers: Record<string, string>): Promise<GithubPull[]> {
  const reposRes = await fetch(
    "https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&sort=pushed&per_page=8",
    { headers }
  );
  if (!reposRes.ok) throw new Error(`GitHub repo list failed (${reposRes.status})`);
  const repos = (await reposRes.json()) as Array<{ full_name?: string }>;
  const pulls: GithubPull[] = [];
  for (const repo of repos.slice(0, 8)) {
    if (!repo.full_name) continue;
    const prRes = await fetch(`https://api.github.com/repos/${repo.full_name}/pulls?state=open&per_page=3`, { headers });
    if (!prRes.ok) continue;
    const list = (await prRes.json()) as Array<{ number: number; title: string }>;
    for (const pr of list) {
      pulls.push({ repo: repo.full_name, prNumber: pr.number, title: pr.title });
      if (pulls.length >= 5) return pulls;
    }
  }
  return pulls;
}

function ok(kind: string, summary: string, detail: string, url?: string): IntegrationEvent {
  return {
    id: randomUUID(),
    app: "github",
    at: new Date().toISOString(),
    kind,
    summary,
    detail,
    url,
    ok: true,
  };
}
