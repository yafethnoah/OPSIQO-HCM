import { describe, expect, it } from "vitest";
import { loadAdapterWithPermission } from "../../src/lib/operations-cockpit/permissions";

describe("cockpit permissions", () => {
  it("returns not_permitted without calling adapter", async () => {
    let called = false;
    const result = await loadAdapterWithPermission({
      actor: { uid: "u", organizationId: "org", roleClass: "employee" },
      adapter: {
        source: "compliance",
        async load() {
          called = true;
          throw new Error("should not run");
        },
      },
      permissionChecker: async () => false,
      now: new Date("2026-08-14T12:00:00Z"),
    });

    expect(called).toBe(false);
    expect(result.truthState).toBe("not_permitted");
  });

  it("rejects cross-tenant adapter items", async () => {
    await expect(
      loadAdapterWithPermission({
        actor: { uid: "u", organizationId: "org-a", roleClass: "hr" },
        adapter: {
          source: "onboarding",
          async load() {
            return {
              source: "onboarding",
              truthState: "value",
              asOfUtc: "2026-08-14T12:00:00Z",
              items: [{
                id: "x",
                organizationId: "org-b",
                source: "onboarding",
                itemType: "case",
                label: "Onboarding case",
                status: "open",
                risk: "low",
                createdAtUtc: "2026-08-14T10:00:00Z",
                sourceRef: "ref",
              }],
            };
          },
        },
        permissionChecker: async () => true,
        now: new Date("2026-08-14T12:00:00Z"),
      })
    ).rejects.toThrow(/Cross-tenant/);
  });
});
