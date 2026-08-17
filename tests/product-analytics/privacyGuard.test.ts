import { describe, expect, it } from "vitest";
import { sanitizeProductEvent } from "../../src/lib/product-analytics/privacyGuard";

describe("OPSIQO privacy-safe analytics", () => {
  it("accepts a bounded workflow event", () => {
    const event = sanitizeProductEvent("opsiqo_workflow_completed", {
      module: "leave",
      workflow: "request_leave",
      result: "success",
      role_class: "employee",
      duration_bucket: "1_3s",
    });

    expect(event.eventName).toBe("opsiqo_workflow_completed");
    expect(event.params.module).toBe("leave");
  });

  it("rejects unknown events", () => {
    expect(() =>
      sanitizeProductEvent("employee_record_viewed", { module: "core_hr" })
    ).toThrow(/Unapproved OPSIQO analytics event/);
  });

  it("rejects unknown parameters", () => {
    expect(() =>
      sanitizeProductEvent("opsiqo_workflow_completed", {
        module: "leave",
        employeeEmail: "person@example.com",
      } as any)
    ).toThrow(/Unapproved analytics parameter/);
  });

  it("rejects email-shaped values", () => {
    expect(() =>
      sanitizeProductEvent("opsiqo_search_completed", {
        module: "home",
        failure_category: "person@example.com",
      })
    ).toThrow(/email address/);
  });

  it("rejects free text", () => {
    expect(() =>
      sanitizeProductEvent("opsiqo_workflow_validation_failed", {
        module: "leave",
        failure_category: "The employee has insufficient vacation balance",
      })
    ).toThrow(/bounded machine label/);
  });

  it("rejects raw numbers", () => {
    expect(() =>
      sanitizeProductEvent("opsiqo_workflow_completed", {
        module: "leave",
        workflow: "request_leave",
        result: "success",
        duration_bucket: 1234 as any,
      })
    ).toThrow(/Raw numeric analytics parameter/);
  });

  it("rejects UUID-like stable identifiers", () => {
    expect(() =>
      sanitizeProductEvent("opsiqo_search_completed", {
        module: "home",
        failure_category: "550e8400-e29b-41d4-a716-446655440000",
      })
    ).toThrow(/stable identifier/);
  });
});
