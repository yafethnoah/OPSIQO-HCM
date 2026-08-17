import { describe, expect, it } from "vitest";
import { validateDependencyGraph } from "../../src/lib/orchestrator/dependencyGraph";
import type { OrchestrationPlan } from "../../src/lib/orchestrator/types";

function basePlan(): OrchestrationPlan {
  return {
    planId: "p",
    organizationId: "o",
    actorUid: "u",
    goalCode: "test",
    state: "draft",
    createdAtUtc: "2026-08-14T12:00:00Z",
    authorizationExpiresAtUtc: "2026-08-14T12:20:00Z",
    evidenceRefs: [],
    version: 1,
    steps: [],
  };
}

describe("dependency graph", () => {
  it("detects cycles", () => {
    const plan = basePlan();
    plan.steps = [
      {
        id: "a",
        title: "A",
        dependencies: ["b"],
        authoritativeService: "a",
        permission: "a",
        riskClass: "read_only",
        state: "waiting",
        confirmationRequired: false,
        idempotencyRequired: false,
      },
      {
        id: "b",
        title: "B",
        dependencies: ["a"],
        authoritativeService: "b",
        permission: "b",
        riskClass: "read_only",
        state: "waiting",
        confirmationRequired: false,
        idempotencyRequired: false,
      },
    ];

    expect(validateDependencyGraph(plan).valid).toBe(false);
  });
});
