import { describe, expect, it } from "vitest";
import {
  validateExecutableStep,
  validateTenantScope,
} from "../../src/lib/orchestrator/governance";

describe("orchestrator governance", () => {
  it("rejects write steps without idempotency", () => {
    expect(
      validateExecutableStep({
        id: "x",
        title: "x",
        dependencies: [],
        authoritativeService: "service",
        permission: "write",
        riskClass: "administrative",
        state: "ready",
        confirmationRequired: false,
        idempotencyRequired: false,
      })
    ).toContain("IDEMPOTENCY_REQUIRED");
  });

  it("rejects consequential direct execution", () => {
    expect(
      validateExecutableStep({
        id: "x",
        title: "x",
        dependencies: [],
        authoritativeService: "service",
        permission: "write",
        riskClass: "consequential",
        state: "ready",
        confirmationRequired: true,
        idempotencyRequired: true,
      })
    ).toContain("CONSEQUENTIAL_DIRECT_EXECUTION_PROHIBITED");
  });

  it("enforces actor and organization scope", () => {
    expect(
      validateTenantScope(
        {
          planId: "p",
          organizationId: "org-a",
          actorUid: "u1",
          goalCode: "x",
          state: "ready",
          createdAtUtc: "2026-08-14T12:00:00Z",
          authorizationExpiresAtUtc: "2026-08-14T12:20:00Z",
          evidenceRefs: [],
          version: 1,
          steps: [],
        },
        { uid: "u1", organizationId: "org-b", roleClass: "hr" }
      )
    ).toBe(false);
  });
});
