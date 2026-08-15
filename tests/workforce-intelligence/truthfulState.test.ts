import { describe, expect, it } from "vitest";
import {
  truthfulValue,
  validateObservationTruthState,
} from "../../src/lib/workforce-intelligence/truthfulState";

const lineage = [{
  sourceKey: "core_hr",
  sourceSystem: "Core HR",
  authoritative: true,
  evidenceRefs: ["evidence:1"],
  asOfUtc: "2026-08-14T12:00:00Z",
}];

describe("workforce intelligence truthful states", () => {
  it("does not turn not_permitted into zero", () => {
    const observation = {
      metricId: "active_headcount" as const,
      organizationId: "org",
      truthState: "not_permitted" as const,
      dimension: "none" as const,
      lineage,
    };

    expect(truthfulValue(observation)).toBeNull();
  });

  it("requires value for value state", () => {
    const errors = validateObservationTruthState({
      metricId: "active_headcount",
      organizationId: "org",
      truthState: "value",
      dimension: "none",
      lineage,
    });
    expect(errors).toContain("VALUE_REQUIRED_FOR_VALUE_STATE");
  });

  it("rejects value in insufficient evidence state", () => {
    const errors = validateObservationTruthState({
      metricId: "turnover_rate",
      organizationId: "org",
      truthState: "insufficient_evidence",
      value: 0,
      dimension: "none",
      lineage,
    });
    expect(errors).toContain("VALUE_NOT_ALLOWED_FOR_NON_VALUE_STATE");
  });
});
