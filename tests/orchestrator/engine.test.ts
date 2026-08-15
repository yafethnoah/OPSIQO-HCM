import { describe, expect, it } from "vitest";
import { GovernedOrchestrator } from "../../src/lib/orchestrator/engine";
import type {
  AuthoritativeServiceBinding,
  OrchestrationPlan,
} from "../../src/lib/orchestrator/types";

function plan(): OrchestrationPlan {
  return {
    planId: "p",
    organizationId: "org",
    actorUid: "u",
    goalCode: "test_admin_workflow",
    state: "ready",
    createdAtUtc: "2026-08-14T12:00:00Z",
    authorizationExpiresAtUtc: "2026-08-14T12:20:00Z",
    evidenceRefs: [],
    version: 1,
    steps: [
      {
        id: "write",
        title: "Write",
        dependencies: [],
        authoritativeService: "service.write",
        permission: "write.permission",
        riskClass: "administrative",
        state: "ready",
        confirmationRequired: false,
        idempotencyRequired: true,
      },
    ],
  };
}

describe("governed orchestrator", () => {
  it("rechecks permission before execution", async () => {
    let called = false;
    const service: AuthoritativeServiceBinding = {
      key: "service.write",
      async execute() {
        called = true;
        return { outcome: "completed" };
      },
    };

    const engine = new GovernedOrchestrator({
      permissionChecker: async () => false,
      tenantScopeChecker: async () => true,
      services: new Map([[service.key, service]]),
      now: () => new Date("2026-08-14T12:05:00Z"),
    });

    const result = await engine.run({
      plan: plan(),
      actor: { uid: "u", organizationId: "org", roleClass: "hr" },
    });

    expect(called).toBe(false);
    expect(result.blockedReasons).toContain(
      "write:PERMISSION_DENIED_AT_EXECUTION"
    );
  });

  it("moves uncertain writes to reconciliation", async () => {
    const service: AuthoritativeServiceBinding = {
      key: "service.write",
      async execute() {
        return { outcome: "unknown_after_write" };
      },
      async reconcile() {
        return { outcome: "completed", resultReference: "safe-ref" };
      },
    };

    const engine = new GovernedOrchestrator({
      permissionChecker: async () => true,
      tenantScopeChecker: async () => true,
      services: new Map([[service.key, service]]),
      now: () => new Date("2026-08-14T12:05:00Z"),
    });

    const first = await engine.run({
      plan: plan(),
      actor: { uid: "u", organizationId: "org", roleClass: "hr" },
    });

    expect(first.plan.state).toBe("reconciliation_required");

    const reconciled = await engine.reconcile({
      plan: first.plan,
      stepId: "write",
      actor: { uid: "u", organizationId: "org", roleClass: "hr" },
    });

    expect(reconciled.plan.steps[0].state).toBe("completed");
  });

  it("blocks an expired plan", async () => {
    const service: AuthoritativeServiceBinding = {
      key: "service.write",
      async execute() {
        return { outcome: "completed" };
      },
    };

    const engine = new GovernedOrchestrator({
      permissionChecker: async () => true,
      tenantScopeChecker: async () => true,
      services: new Map([[service.key, service]]),
      now: () => new Date("2026-08-14T12:21:00Z"),
    });

    const result = await engine.run({
      plan: plan(),
      actor: { uid: "u", organizationId: "org", roleClass: "hr" },
    });

    expect(result.blockedReasons).toContain("PLAN_AUTHORIZATION_EXPIRED");
  });
});
