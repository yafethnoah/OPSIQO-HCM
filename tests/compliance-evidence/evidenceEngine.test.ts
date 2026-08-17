import { describe, expect, it } from "vitest";
import { EvidenceAdapterRegistry } from "../../src/lib/compliance-evidence/adapterRegistry";
import { ComplianceEvidenceEngine } from "../../src/lib/compliance-evidence/evidenceEngine";

describe("compliance evidence engine", () => {
  it("fails closed when requirement has no adapter", async () => {
    const engine = new ComplianceEvidenceEngine(
      new EvidenceAdapterRegistry(),
      async () => true,
      () => new Date("2026-08-14T12:00:00Z")
    );

    const result = await engine.evaluate({
      actor: { uid: "u", organizationId: "org", roleClass: "hr" },
      requirementKey: "policy.code_of_conduct.current",
    });

    expect(result.state).toBe("not_configured");
  });

  it("downgrades controlled document without version/hash evidence", async () => {
    const registry = new EvidenceAdapterRegistry();
    registry.register({
      key: "docs",
      requirementKeys: ["document.controlled_versions"],
      async load() {
        return {
          requirementKey: "document.controlled_versions",
          state: "present",
          asOfUtc: "2026-08-14T12:00:00Z",
          items: [{
            id: "doc1",
            organizationId: "org",
            requirementKey: "document.controlled_versions",
            category: "controlled_document",
            state: "present",
            label: "Controlled document",
            sourceRef: "document:1",
            legalHoldState: "none",
            lineage: [{
              sourceKey: "documents",
              sourceSystem: "Governed Documents",
              authoritative: true,
              sourceRef: "document:1",
              observedAtUtc: "2026-08-14T12:00:00Z",
            }],
          }],
        };
      },
    });

    const engine = new ComplianceEvidenceEngine(
      registry,
      async () => true,
      () => new Date("2026-08-14T12:00:00Z")
    );

    const result = await engine.evaluate({
      actor: { uid: "u", organizationId: "org", roleClass: "hr" },
      requirementKey: "document.controlled_versions",
    });

    expect(result.state).toBe("present_partial");
  });
});
