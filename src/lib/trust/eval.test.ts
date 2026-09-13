import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gateEvalSummary, minimizeEvalSummary } from "./eval-cases";

describe("policy gate battery", () => {
  it("matches every expected verdict", () => {
    const summary = gateEvalSummary();
    const missed = summary.results.filter((r) => !r.ok);
    assert.equal(summary.matched, summary.total, JSON.stringify(missed, null, 2));
  });

  it("never forwards PII or secrets to the model", () => {
    const summary = minimizeEvalSummary();
    const missed = summary.results.filter((r) => !r.ok);
    assert.equal(summary.matched, summary.total, JSON.stringify(missed, null, 2));
  });
});
