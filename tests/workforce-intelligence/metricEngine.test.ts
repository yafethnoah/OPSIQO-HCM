import { describe, expect, it } from "vitest";
import { IntelligenceAdapterRegistry } from "../../src/lib/workforce-intelligence/adapterRegistry";
import { WorkforceIntelligenceEngine } from "../../src/lib/workforce-intelligence/metricEngine";

describe("workforce intelligence engine", () => {
  it("fails closed when no adapter is configured", async () => {
    const registry = new IntelligenceAdapterRegistry();
    const engine = new WorkforceIntelligenceEngine(
      registry,
      async () => true
    );

    const result = await engine.evaluate({
      actor: { uid: "u", organizationId: "org", roleClass: "hr" },
      metricId: "active_headcount",
    });

    expect(result.truthState).toBe("not_configured");
    expect(result.value).toBeNull();
  });

  it("rejects cross-tenant observations", async () => {
    const registry = new IntelligenceAdapterRegistry();

    registry.register({
      key: "core_hr",
      metricIds: ["active_headcount"],
      async load() {
        return {
          metricId: "active_headcount",
          organizationId: "other-org",
          truthState: "value",
          value: 10,
          dimension: "none",
          lineage: [{
            sourceKey: "core_hr",
            sourceSystem: "Core HR",
            authoritative: true,
            evidenceRefs: [],
            asOfUtc: "2026-08-14T12:00:00Z",
          }],
        };
      },
    });

    const engine = new WorkforceIntelligenceEngine(
      registry,
      async () => true
    );

    const result = await engine.evaluate({
      actor: { uid: "u", organizationId: "org", roleClass: "hr" },
      metricId: "active_headcount",
    });

    expect(result.truthState).toBe("error");
    expect(result.value).toBeNull();
  });

  it("suppresses small grouped results", async () => {
    const registry = new IntelligenceAdapterRegistry();

    registry.register({
      key: "core_hr",
      metricIds: ["turnover_rate"],
      async load() {
        return {
          metricId: "turnover_rate",
          organizationId: "org",
          truthState: "value",
          value: 25,
          dimension: "organization_unit",
          dimensionValue: "unit-a",
          groupSize: 4,
          completeness: 1,
          freshnessMinutes: 10,
          lineage: [{
            sourceKey: "core_hr",
            sourceSystem: "Core HR",
            authoritative: true,
            evidenceRefs: ["evidence:1"],
            asOfUtc: "2026-08-14T12:00:00Z",
          }],
        };
      },
    });

    const engine = new WorkforceIntelligenceEngine(
      registry,
      async () => true
    );

    const result = await engine.evaluate({
      actor: { uid: "u", organizationId: "org", roleClass: "hr" },
      metricId: "turnover_rate",
      dimension: "organization_unit",
      dimensionValue: "unit-a",
    });

    expect(result.truthState).toBe("suppressed_small_cell");
    expect(result.value).toBeNull();
  });
});
