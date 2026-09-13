import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { signSession, verifySession } from "./signed-session";

const demo = { id: "user_demo", name: "Aegis Demo", email: "demo@aegis.local" };

describe("signed session cookies", () => {
  it("round-trips a session identity without disk", () => {
    const { token, expiresAt } = signSession(demo);
    assert.ok(token.startsWith("v1."));
    assert.ok(Date.parse(expiresAt) > Date.now());
    assert.deepEqual(verifySession(token), demo);
  });

  it("rejects a tampered payload", () => {
    const { token } = signSession(demo);
    const [prefix, body, sig] = token.split(".");
    const tweaked = Buffer.from(JSON.stringify({ ...demo, email: "other@example.com", exp: Date.now() + 60_000 })).toString(
      "base64url"
    );
    assert.equal(verifySession(`${prefix}.${tweaked}.${sig}`), null);
  });

  it("rejects an expired token", () => {
    const now = Date.now();
    const { token } = signSession(demo, now);
    assert.equal(verifySession(token, now + 1000 * 60 * 60 * 24 * 31), null);
  });

  it("ignores opaque legacy tokens", () => {
    assert.equal(verifySession("a".repeat(64)), null);
    assert.equal(verifySession(""), null);
    assert.equal(verifySession(undefined), null);
  });
});
