import { describe, expect, it } from "vitest";
import { evaluateRetention } from "../../src/lib/compliance-evidence/retention";

function item() {
  return {
    id: "e1",
    organizationId: "org",
    requirementKey: "audit.example",
    category: "audit" as const,
    state: "present" as const,
    label: "Audit evidence",
    sourceRef: "audit:1",
    legalHoldState: "none" as const,
    retentionUntilUtc: "2026-08-01T00:00:00Z",
    lineage: [],
  };
}

describe("retention and legal hold", () => {
  it("blocks disposition under legal hold", () => {
    const result = evaluateRetention({
      item: { ...item(), legalHoldState: "active" },
      rule: {
        retentionClass: "audit",
        description: "Approved audit retention",
        durationDays: 365,
        disposition: "delete_if_permitted",
        approved: true,
      },
      now: new Date("2026-08-14T12:00:00Z"),
    });

    expect(result.mustPreserve).toBe(true);
    expect(result.reason).toBe("LEGAL_HOLD_ACTIVE");
  });

  it("does not delete under an unapproved rule", () => {
    const result = evaluateRetention({
      item: item(),
      rule: {
        retentionClass: "audit",
        description: "Draft",
        durationDays: 365,
        disposition: "delete_if_permitted",
        approved: false,
      },
      now: new Date("2026-08-14T12:00:00Z"),
    });

    expect(result.eligibleForDisposition).toBe(false);
    expect(result.reason).toBe("RETENTION_RULE_NOT_APPROVED");
  });
});
