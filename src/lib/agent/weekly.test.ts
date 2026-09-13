import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluate } from "../trust/engine";
import { agents, policies } from "../trust/seed";
import { weeklyPlan } from "./weekly";

describe("weekly ops plan", () => {
  it("holds the summary email and allows the rest", () => {
    const plan = weeklyPlan("weekly close-out", []);
    const ops = agents.find((a) => a.id === "ops-autopilot");
    const byKey = Object.fromEntries(
      plan.map((p) => {
        const v = evaluate(p, ops, policies);
        return [`${p.app}:${p.action}`, v.decision];
      })
    );
    assert.equal(byKey["github:read"], "allow");
    assert.equal(byKey["github:comment"], "allow");
    assert.equal(byKey["slack:post"], "allow");
    assert.equal(byKey["notion:write"], "allow");
    assert.equal(byKey["gmail:send"], "require_approval");
  });
});
