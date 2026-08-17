import type { PortfolioCandidate, PortfolioScore } from "./types";

function assertRange(name: string, value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 5) {
    throw new Error(`${name} must be an integer from 0 to 5.`);
  }
}

export function scorePortfolioCandidate(
  candidate: PortfolioCandidate
): PortfolioScore {
  for (const [name, value] of Object.entries(candidate)) {
    if (
      name !== "id" &&
      name !== "title" &&
      typeof value === "number"
    ) {
      assertRange(name, value);
    }
  }

  // Benefits weighted positively; risk/effort negatively.
  const score =
    candidate.evidenceStrength * 3 +
    candidate.userValue * 3 +
    candidate.strategicAlignment * 2 +
    candidate.reliabilityBenefit * 3 -
    candidate.securityPrivacyRisk * 4 -
    candidate.implementationEffort * 2 -
    candidate.changeRisk * 3;

  // Theoretical range: positive 55, negative -45.
  const normalizedScore = Math.round(((score + 45) / 100) * 100);

  const reasons: string[] = [];

  if (candidate.securityPrivacyRisk >= 4) {
    reasons.push("High security/privacy risk requires governance review.");
    return {
      id: candidate.id,
      score,
      normalizedScore,
      recommendation: "governance_review",
      reasons,
    };
  }

  if (candidate.evidenceStrength <= 1) {
    reasons.push("Evidence is too weak for prioritization.");
  }
  if (candidate.userValue >= 4) reasons.push("Strong user value.");
  if (candidate.reliabilityBenefit >= 4) reasons.push("Strong reliability benefit.");
  if (candidate.implementationEffort >= 4) reasons.push("High implementation effort.");
  if (candidate.changeRisk >= 4) reasons.push("High change risk.");

  const recommendation =
    normalizedScore >= 70 && candidate.evidenceStrength >= 3
      ? "prioritize"
      : normalizedScore >= 50
        ? "consider"
        : "defer";

  return {
    id: candidate.id,
    score,
    normalizedScore,
    recommendation,
    reasons,
  };
}
