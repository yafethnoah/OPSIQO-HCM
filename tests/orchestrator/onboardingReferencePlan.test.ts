import { describe, expect, it } from "vitest";
import { buildApprovedEmployeeOnboardingPlan } from "../../src/lib/orchestrator/onboardingReferencePlan";
import { validateDependencyGraph } from "../../src/lib/orchestrator/dependencyGraph";

describe("approved employee onboarding reference plan", () => {
  const plan = buildApprovedEmployeeOnboardingPlan({
    planId: "onb-1",
    organizationId: "org",
    actorUid: "hr-user",
    createdAtUtc: "2026-08-14T12:00:00Z",
    authorizationExpiresAtUtc: "2026-08-14T12:20:00Z",
    hireApprovalEvidenceRef: "evidence:hire-approved",
    employeePayloadRef: "payload:employee",
    assignmentPayloadRef: "payload:assignment",
  });

  it("has a valid dependency graph", () => {
    expect(validateDependencyGraph(plan).valid).toBe(true);
  });

  it("requires human confirmation for employee creation", () => {
    expect(
      plan.steps.find(step => step.id === "create_employee")?.humanCheckpoint
    ).toBe(true);
  });

  it("does not contain a hiring decision step", () => {
    expect(plan.steps.some(step => step.id.includes("hire_candidate"))).toBe(false);
  });

  it("uses authoritative service keys", () => {
    expect(
      plan.steps.every(step => step.authoritativeService.length > 0)
    ).toBe(true);
  });
});
