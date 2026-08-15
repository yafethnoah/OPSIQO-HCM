import { describe, expect, it } from "vitest";
import { buildOperationProgress } from "../../src/lib/ux-performance/operationProgress";

describe("truthful operation progress", () => {
  it("returns indeterminate while awaiting confirmation", () => {
    const progress = buildOperationProgress({
      currentStageId: "awaiting_confirmation",
    });
    expect(progress.percent).toBeNull();
    expect(progress.indeterminate).toBe(true);
  });

  it("clamps backend measurable percentage", () => {
    expect(
      buildOperationProgress({
        currentStageId: "executing",
        measurablePercent: 140,
      }).percent
    ).toBe(100);
  });

  it("marks completion as 100 percent", () => {
    const progress = buildOperationProgress({ currentStageId: "completed" });
    expect(progress.percent).toBe(100);
    expect(progress.indeterminate).toBe(false);
  });

  it("does not fabricate a percentage during reconciliation", () => {
    const progress = buildOperationProgress({ currentStageId: "reconciliation" });
    expect(progress.percent).toBeNull();
    expect(progress.indeterminate).toBe(true);
  });
});
