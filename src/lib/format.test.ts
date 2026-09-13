import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_TIMESTAMPS_PER_MINUTE, pacificOpenMs, spreadAfterOpen } from "./format";

describe("spread timestamps after 10:12 AM Pacific", () => {
  it("clamps a pile of early times and uses at most 5 per displayed minute", () => {
    const early = "2026-09-13T16:00:00.000Z";
    const pile = Array.from({ length: 12 }, () => early);
    const spread = spreadAfterOpen(pile);
    const minutes = spread.map((iso) =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(iso))
    );
    const counts = new Map<string, number>();
    for (const m of minutes) counts.set(m, (counts.get(m) ?? 0) + 1);
    for (const n of counts.values()) assert.ok(n <= MAX_TIMESTAMPS_PER_MINUTE);
    assert.equal(counts.size, 3);
    const open = pacificOpenMs(Date.parse(early));
    assert.ok(spread.every((iso) => Date.parse(iso) >= open));
  });

  it("does not pull later times backward", () => {
    const late = "2026-09-13T19:05:00.000Z";
    const [out] = spreadAfterOpen([late]);
    assert.equal(Date.parse(out), Date.parse(late));
  });
});
