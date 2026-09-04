import { describe, expect, it } from "vitest";
import { scorePortfolioCandidate } from "../../src/lib/experimentation/portfolioScoring";

describe("portfolio scoring", () => {
  it("prioritizes strong evidence/value with manageable risk", () => {
    const result = scorePortfolioCandidate({
      id: "P1",
      title: "AI progress UX",
      evidenceStrength: 5,
      userValue: 5,
      strategicAlignment: 5,
      reliabilityBenefit: 4,
      securityPrivacyRisk: 1,
      implementationEffort: 2,
      changeRisk: 1,
    });
    expect(result.recommendation).toBe("prioritize");
  });

  it("forces governance review for high security/privacy risk", () => {
    const result = scorePortfolioCandidate({
      id: "P2",
      title: "Sensitive change",
      evidenceStrength: 5,
      userValue: 5,
      strategicAlignment: 5,
      reliabilityBenefit: 5,
      securityPrivacyRisk: 5,
      implementationEffort: 1,
      changeRisk: 1,
    });
    expect(result.recommendation).toBe("governance_review");
  });

  it("rejects invalid score ranges", () => {
    expect(() =>
      scorePortfolioCandidate({
        id: "P3",
        title: "Invalid",
        evidenceStrength: 7 as any,
        userValue: 1,
        strategicAlignment: 1,
        reliabilityBenefit: 1,
        securityPrivacyRisk: 1,
        implementationEffort: 1,
        changeRisk: 1,
      })
    ).toThrow(/0 to 5/);
  });
});
