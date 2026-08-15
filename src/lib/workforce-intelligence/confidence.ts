import type {
  IntelligenceConfidence,
  MetricObservation,
} from "./types";
import { validateLineage } from "./lineage";

export function calculateConfidence(
  observation: MetricObservation
): IntelligenceConfidence {
  if (
    observation.truthState !== "value" &&
    observation.truthState !== "partial"
  ) {
    return "unknown";
  }

  if (validateLineage(observation.lineage).length > 0) {
    return "low";
  }

  const completeness = observation.completeness ?? 0;
  const freshness = observation.freshnessMinutes ?? Number.POSITIVE_INFINITY;

  if (
    observation.truthState === "value" &&
    completeness >= 0.95 &&
    freshness <= 60
  ) {
    return "high";
  }

  if (
    completeness >= 0.80 &&
    freshness <= 24 * 60
  ) {
    return "medium";
  }

  return "low";
}
