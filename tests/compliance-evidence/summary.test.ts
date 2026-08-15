import { describe, expect, it } from "vitest";
import { summarizeEvidenceCenter } from "../../src/lib/compliance-evidence/summary";

describe("evidence center summary", () => {
  it("preserves not permitted separately", () => {
    const summary = summarizeEvidenceCenter([{
      requirementKey: "x",
      state: "not_permitted",
      items: [],
      asOfUtc: "2026-08-14T12:00:00Z",
    }]);

    expect(summary.notPermittedRequirements).toBe(1);
    expect(summary.sourceStates[0].count).toBeNull();
  });
});
