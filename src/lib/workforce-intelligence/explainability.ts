import type { IntelligenceResult } from "./types";

export function formatIntelligenceExplanation(
  result: IntelligenceResult
): string[] {
  const lines: string[] = [];

  lines.push(`Metric: ${result.metricId}`);
  lines.push(`State: ${result.truthState}`);
  lines.push(`Confidence: ${result.confidence}`);
  lines.push(`Definition: ${result.explanation.definition}`);
  lines.push(`Formula: ${result.explanation.formula}`);

  if (result.value !== null) {
    lines.push(`Value: ${result.value} ${result.unit}`);
  }

  if (result.explanation.evidenceCoverage !== null) {
    lines.push(
      `Evidence coverage: ${(result.explanation.evidenceCoverage * 100).toFixed(1)}%`
    );
  }

  if (result.explanation.freshnessMinutes !== null) {
    lines.push(`Freshness: ${result.explanation.freshnessMinutes} minutes`);
  }

  if (result.explanation.sources.length > 0) {
    lines.push(`Sources: ${result.explanation.sources.join(", ")}`);
  }

  if (result.explanation.privacyMessage) {
    lines.push(`Privacy: ${result.explanation.privacyMessage}`);
  }

  for (const caveat of result.explanation.caveats) {
    lines.push(`Caveat: ${caveat}`);
  }

  return lines;
}

export function prohibitedCausalClaim(
  claimType:
    | "employee_intent"
    | "employee_motivation"
    | "protected_attribute_inference"
    | "individual_future_behavior"
): never {
  throw new Error(
    `Unsupported causal/predictive workforce claim: ${claimType}`
  );
}
