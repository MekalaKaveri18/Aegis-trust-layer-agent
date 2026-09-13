import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectDataClasses, minimizeText } from "./minimize";

describe("policy-based data minimization", () => {
  it("redacts PII so the model never sees the raw values", () => {
    const raw =
      "From casey@gmail.com call (415) 555-0134 — SSN 078-05-1120 — card 4111111111111111";
    const result = minimizeText(raw);
    assert.equal(result.forModel.includes("casey@gmail.com"), false);
    assert.equal(result.forModel.includes("078-05-1120"), false);
    assert.equal(result.forModel.includes("4111111111111111"), false);
    assert.equal(result.forModel.includes("(415) 555-0134"), false);
    assert.match(result.forModel, /\[EMAIL\]/);
    assert.match(result.forModel, /\[SSN\]/);
    assert.match(result.forModel, /\[PAN\]/);
    assert.match(result.forModel, /\[PHONE\]/);
    assert.equal(result.redactedCount, 4);
  });

  it("redacts API keys and AWS access keys", () => {
    const raw = "prod sk_live_not_real_do_not_send and AKIAIOSFODNN7EXAMPLE";
    const result = minimizeText(raw);
    assert.equal(result.forModel.includes("sk_live_not_real_do_not_send"), false);
    assert.equal(result.forModel.includes("AKIAIOSFODNN7EXAMPLE"), false);
    const classes = result.findings.map((f) => f.class).sort();
    assert.deepEqual(classes, ["api_key", "aws_key"]);
  });

  it("can hash instead of redact when policy says so", () => {
    const raw = "notify maya@acme.internal";
    const result = minimizeText(raw, { email: "hash" });
    assert.equal(result.forModel.includes("maya@acme.internal"), false);
    assert.match(result.forModel, /\[EMAIL:[0-9a-f]{8}\]/);
  });

  it("ignores numbers that are not Luhn-valid cards", () => {
    const found = detectDataClasses("Invoice 184221842218422");
    assert.equal(found.has("credit_card"), false);
  });
});
