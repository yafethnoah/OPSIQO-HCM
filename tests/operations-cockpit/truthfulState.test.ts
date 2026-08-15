import { describe, expect, it } from "vitest";
import {
  authoritativeCount,
  createTruthfulDataset,
} from "../../src/lib/operations-cockpit/truthfulState";

describe("truthful cockpit states", () => {
  it("returns zero only for an authoritative empty value dataset", () => {
    const dataset = createTruthfulDataset({
      source: "approvals",
      truthState: "value",
      items: [],
      asOfUtc: "2026-08-14T12:00:00Z",
    });
    expect(authoritativeCount(dataset)).toBe(0);
  });

  it("returns null when not permitted", () => {
    const dataset = createTruthfulDataset({
      source: "approvals",
      truthState: "not_permitted",
      asOfUtc: "2026-08-14T12:00:00Z",
    });
    expect(authoritativeCount(dataset)).toBeNull();
  });

  it("rejects items carried by unavailable state", () => {
    expect(() =>
      createTruthfulDataset({
        source: "approvals",
        truthState: "unavailable",
        items: [{
          id: "x",
          organizationId: "org",
          source: "approvals",
          itemType: "approval",
          label: "approval",
          status: "open",
          risk: "low",
          createdAtUtc: "2026-08-14T12:00:00Z",
          sourceRef: "ref",
        }],
        asOfUtc: "2026-08-14T12:00:00Z",
      })
    ).toThrow();
  });
});
