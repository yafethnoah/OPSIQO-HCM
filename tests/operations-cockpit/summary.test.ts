import { describe, expect, it } from "vitest";
import { summarizeCockpit } from "../../src/lib/operations-cockpit/summary";

describe("cockpit summary", () => {
  it("does not convert not_permitted into zero", () => {
    const summary = summarizeCockpit([{
      source: "compliance",
      truthState: "not_permitted",
      items: [],
      asOfUtc: "2026-08-14T12:00:00Z",
    }], new Date("2026-08-14T12:00:00Z"));

    expect(summary.sources[0].count).toBeNull();
  });
});
