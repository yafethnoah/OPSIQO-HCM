import { describe, expect, it } from "vitest";
import { loadEvidenceWithPermission } from "../../src/lib/compliance-evidence/permissions";

describe("evidence permissions", () => {
  it("does not call adapter when not permitted", async () => {
    let called = false;

    const result = await loadEvidenceWithPermission({
      actor: { uid: "u", organizationId: "org", roleClass: "employee" },
      adapter: {
        key: "release",
        requirementKeys: ["release.production_certification"],
        async load() {
          called = true;
          throw new Error("should not execute");
        },
      },
      requirementKey: "release.production_certification",
      permissionChecker: async () => false,
      now: new Date("2026-08-14T12:00:00Z"),
    });

    expect(called).toBe(false);
    expect(result.state).toBe("not_permitted");
  });

  it("rejects cross-tenant evidence", async () => {
    await expect(loadEvidenceWithPermission({
      actor: { uid: "u", organizationId: "org-a", roleClass: "hr" },
      adapter: {
        key: "audit",
        requirementKeys: ["audit.example"],
        async load() {
          return {
            requirementKey: "audit.example",
            state: "present",
            asOfUtc: "2026-08-14T12:00:00Z",
            items: [{
              id: "1",
              organizationId: "org-b",
              requirementKey: "audit.example",
              category: "audit",
              state: "present",
              label: "Audit",
              sourceRef: "audit:1",
              legalHoldState: "none",
              lineage: [],
            }],
          };
        },
      },
      requirementKey: "audit.example",
      permissionChecker: async () => true,
      now: new Date("2026-08-14T12:00:00Z"),
    })).rejects.toThrow(/Cross-tenant/);
  });
});
