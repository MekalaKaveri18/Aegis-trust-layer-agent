import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIXTURE_THREADS } from "./fixtures";
import { buildTriagePlan, classify, resolveGithubTarget } from "./plan";

describe("support copilot planner", () => {
  it("classifies the secret fixture as secret", () => {
    assert.equal(classify(FIXTURE_THREADS[1]), "secret");
  });

  it("prefers a live GitHub pull over the fixture repo", () => {
    const live = [{ repo: "lemma/real", prNumber: 9, title: "fix", source: "github" as const }];
    const target = resolveGithubTarget(live);
    assert.equal(target.repo, "lemma/real");
    assert.equal(target.prNumber, 9);
  });

  it("refuses to propose a work send for secrets", () => {
    const plan = buildTriagePlan("triage", FIXTURE_THREADS, []);
    const workSends = plan.filter((s) => s.kind === "work" && s.proposed?.action === "send");
    const refuse = plan.find((s) => s.lane === "refuse-secret");
    const probe = plan.find((s) => s.lane === "eval-secret");
    assert.equal(workSends.length, 0);
    assert.equal(refuse?.expected, "no_send");
    assert.equal(probe?.expected, "deny");
    assert.equal(probe?.kind, "eval");
  });
});
