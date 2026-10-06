import { describe, expect, it } from "vitest";
import { conditionMatches } from "../../src/modules/hr-forms-workflows/conditional-engine";

describe("HR Forms conditional engine", () => {
  it("matches contractor branch", () => {
    expect(conditionMatches({
      id: "c1",
      sourceFieldId: "workerType",
      operator: "equals",
      value: "contractor",
      action: "show_field",
      targetId: "hst"
    }, { workerType: "contractor" })).toBe(true);
  });

  it("supports empty/not-empty", () => {
    expect(conditionMatches({
      id: "c2", sourceFieldId: "x", operator: "empty",
      action: "hide_field", targetId: "y"
    }, { x: "" })).toBe(true);
  });
});
