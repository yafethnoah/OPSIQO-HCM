import { describe, expect, it } from "vitest";
import {
  evidenceCount,
  validateEvidenceDataset,
} from "../../src/lib/compliance-evidence/truthfulState";

describe("evidence truthful states", () => {
  it("does not turn not permitted into zero", () => {
    expect(evidenceCount({
      requirementKey: "x",
      state: "not_permitted",
      items: [],
      asOfUtc: "2026-08-14T12:00:00Z",
    })).toBeNull();
  });

  it("allows authoritative zero only through a present state with items semantics elsewhere", () => {
    expect(validateEvidenceDataset({
      requirementKey: "x",
      state: "missing",
      items: [],
      asOfUtc: "2026-08-14T12:00:00Z",
    })).toEqual([]);
  });

  it("rejects items attached to not configured", () => {
    expect(validateEvidenceDataset({
      requirementKey: "x",
      state: "not_configured",
      items: [{
        id: "1",
        organizationId: "org",
        requirementKey: "x",
        category: "audit",
        state: "present",
        label: "Audit evidence",
        sourceRef: "audit:1",
        legalHoldState: "none",
        lineage: [],
      }],
      asOfUtc: "2026-08-14T12:00:00Z",
    })).toContain("ITEMS_NOT_ALLOWED_FOR_DATASET_STATE");
  });
});
