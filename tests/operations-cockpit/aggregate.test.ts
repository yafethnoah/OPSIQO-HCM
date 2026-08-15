import { describe, expect, it } from "vitest";
import { aggregateCockpit } from "../../src/lib/operations-cockpit/aggregate";

describe("cockpit aggregation", () => {
  it("isolates a failing adapter as an error state", async () => {
    const result = await aggregateCockpit({
      actor: { uid: "u", organizationId: "org", roleClass: "hr" },
      adapters: [{
        source: "imports",
        async load() {
          throw new Error("unavailable");
        },
      }],
      permissionChecker: async () => true,
      now: new Date("2026-08-14T12:00:00Z"),
    });

    expect(result.datasets[0].truthState).toBe("error");
  });
});
