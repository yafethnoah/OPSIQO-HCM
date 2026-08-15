import { describe, expect, it } from "vitest";
import { calculateCockpitPriority } from "../../src/lib/operations-cockpit/priority";

describe("cockpit priority", () => {
  it("prioritizes reconciliation and critical risk", () => {
    const p = calculateCockpitPriority({
      id: "x",
      organizationId: "org",
      source: "ai_reconciliation",
      itemType: "reconciliation",
      label: "AI reconciliation case",
      status: "reconciliation_required",
      risk: "critical",
      createdAtUtc: "2026-08-14T10:00:00Z",
      sourceRef: "ref",
    }, new Date("2026-08-14T12:00:00Z"));

    expect(p.band).toBe("critical");
    expect(p.score).toBe(100);
  });

  it("does not score a person", () => {
    const p = calculateCockpitPriority({
      id: "task-1",
      organizationId: "org",
      source: "workflow_tasks",
      itemType: "task",
      label: "Operational task",
      status: "open",
      risk: "low",
      createdAtUtc: "2026-08-14T10:00:00Z",
      sourceRef: "task-ref",
    }, new Date("2026-08-14T12:00:00Z"));
    expect(p.itemId).toBe("task-1");
  });
});
