import { describe, expect, it } from "vitest";
import { METRIC_CATALOG } from "../../src/lib/workforce-intelligence/metricCatalog";

describe("metric catalog", () => {
  it("prohibits individual scoring on every metric", () => {
    for (const definition of Object.values(METRIC_CATALOG)) {
      expect(definition.individualScoring).toBe(false);
    }
  });

  it("does not expose sensitive demographic dimensions by default", () => {
    const allDimensions = new Set(
      Object.values(METRIC_CATALOG).flatMap(d => d.allowedDimensions)
    );

    for (const forbidden of [
      "race",
      "ethnicity",
      "religion",
      "disability",
      "medical",
      "gender",
      "age",
      "sexual_orientation",
      "salary",
    ]) {
      expect(allDimensions.has(forbidden as any)).toBe(false);
    }
  });
});
