import { describe, expect, it } from "vitest";
import {
  applySmallCellSuppression,
  DEFAULT_MINIMUM_GROUP_SIZE,
} from "../../src/lib/workforce-intelligence/privacyThresholds";

describe("small-cell suppression", () => {
  it("suppresses grouped results below the threshold", () => {
    const result = applySmallCellSuppression({
      metricId: "turnover_rate",
      organizationId: "org",
      truthState: "value",
      value: 12.5,
      groupSize: 4,
      dimension: "organization_unit",
      dimensionValue: "unit-a",
      lineage: [{
        sourceKey: "core_hr",
        sourceSystem: "Core HR",
        authoritative: true,
        evidenceRefs: [],
        asOfUtc: "2026-08-14T12:00:00Z",
      }],
    }, {
      minimumGroupSize: DEFAULT_MINIMUM_GROUP_SIZE,
      suppressGroupedCounts: true,
      suppressGroupedRates: true,
    });

    expect(result.truthState).toBe("suppressed_small_cell");
    expect(result.value).toBeUndefined();
  });

  it("does not suppress organization-wide ungrouped result", () => {
    const result = applySmallCellSuppression({
      metricId: "active_headcount",
      organizationId: "org",
      truthState: "value",
      value: 4,
      groupSize: 4,
      dimension: "none",
      lineage: [{
        sourceKey: "core_hr",
        sourceSystem: "Core HR",
        authoritative: true,
        evidenceRefs: [],
        asOfUtc: "2026-08-14T12:00:00Z",
      }],
    }, {
      minimumGroupSize: 5,
      suppressGroupedCounts: true,
      suppressGroupedRates: true,
    });

    expect(result.truthState).toBe("value");
  });
});
