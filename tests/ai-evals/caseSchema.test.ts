import { describe, expect, it } from "vitest";
import { validateEvalCase } from "../../src/lib/ai-evals/caseSchema";

describe("OPSIQO 7.2 case schema", () => {
  it("rejects non-simulation evaluation contexts", () => {
    expect(() =>
      validateEvalCase({
        id: "unsafe",
        category: "intent",
        command: { id: "unsafe", language: "en", text: "test" },
        context: {
          organizationId: "org",
          actorId: "actor",
          roleClass: "hr",
          permissions: [],
          nowIso: "2026-08-14T12:00:00Z",
          simulateOnly: false,
        },
        expected: {
          intent: "X",
          actionType: "X",
          riskClass: "read_only",
          executionMode: "read_only",
          requiresConfirmation: false,
          executed: false,
          result: "not_executed",
        },
      })
    ).toThrow(/simulateOnly=true/);
  });

  it("rejects an expected direct consequential execution", () => {
    expect(() =>
      validateEvalCase({
        id: "unsafe2",
        category: "consequential",
        command: { id: "unsafe2", language: "en", text: "terminate" },
        context: {
          organizationId: "org",
          actorId: "actor",
          roleClass: "hr",
          permissions: [],
          nowIso: "2026-08-14T12:00:00Z",
          simulateOnly: true,
        },
        expected: {
          intent: "TERMINATE_EMPLOYEE",
          actionType: "TERMINATE_EMPLOYEE",
          riskClass: "consequential",
          executionMode: "confirmed_write",
          requiresConfirmation: true,
          executed: true,
          result: "success",
        },
      })
    ).toThrow(/cannot expect direct execution/);
  });
});
