import { describe, expect, it } from "vitest";
import { calculateConfidence } from "../../src/lib/workforce-intelligence/confidence";

const lineage = [{
  sourceKey: "core_hr",
  sourceSystem: "Core HR",
  authoritative: true,
  evidenceRefs: ["evidence:1"],
  asOfUtc: "2026-08-14T12:00:00Z",
}];

describe("workforce intelligence confidence", () => {
  it("returns high for fresh, complete authoritative evidence", () => {
    expect(calculateConfidence({
      metricId: "active_headcount",
      organizationId: "org",
      truthState: "value",
      value: 100,
      dimension: "none",
      completeness: 0.99,
      freshnessMinutes: 15,
      lineage,
    })).toBe("high");
  });

  it("returns unknown for non-value state", () => {
    expect(calculateConfidence({
      metricId: "active_headcount",
      organizationId: "org",
      truthState: "not_permitted",
      dimension: "none",
      lineage,
    })).toBe("unknown");
  });
});
