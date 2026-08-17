import { describe, expect, it } from "vitest";
import { calculatePlanProgress } from "../../src/lib/orchestrator/progress";

describe("orchestration progress", () => {
  it("uses completed applicable steps, not elapsed time", () => {
    const progress = calculatePlanProgress({
      planId: "p",
      organizationId: "o",
      actorUid: "u",
      goalCode: "x",
      state: "executing",
      createdAtUtc: "2026-08-14T12:00:00Z",
      authorizationExpiresAtUtc: "2026-08-14T12:20:00Z",
      evidenceRefs: [],
      version: 1,
      steps: [
        {
          id: "a", title: "A", dependencies: [], authoritativeService: "a",
          permission: "a", riskClass: "read_only", state: "completed",
          confirmationRequired: false, idempotencyRequired: false
        },
        {
          id: "b", title: "B", dependencies: ["a"], authoritativeService: "b",
          permission: "b", riskClass: "administrative", state: "executing",
          confirmationRequired: false, idempotencyRequired: true
        },
      ],
    });

    expect(progress.percent).toBe(50);
  });

  it("is indeterminate during reconciliation", () => {
    const progress = calculatePlanProgress({
      planId: "p",
      organizationId: "o",
      actorUid: "u",
      goalCode: "x",
      state: "reconciliation_required",
      createdAtUtc: "2026-08-14T12:00:00Z",
      authorizationExpiresAtUtc: "2026-08-14T12:20:00Z",
      evidenceRefs: [],
      version: 1,
      steps: [],
    });

    expect(progress.indeterminate).toBe(true);
  });
});
