import type { IntelligenceTruthState, MetricObservation } from "./types";

export function validateObservationTruthState(
  observation: MetricObservation
): string[] {
  const errors: string[] = [];

  const valueStates = new Set<IntelligenceTruthState>(["value", "partial"]);

  if (valueStates.has(observation.truthState)) {
    if (typeof observation.value !== "number" || !Number.isFinite(observation.value)) {
      errors.push("VALUE_REQUIRED_FOR_VALUE_STATE");
    }
  } else if (observation.value !== undefined) {
    errors.push("VALUE_NOT_ALLOWED_FOR_NON_VALUE_STATE");
  }

  if (
    observation.completeness !== undefined &&
    (!Number.isFinite(observation.completeness) ||
      observation.completeness < 0 ||
      observation.completeness > 1)
  ) {
    errors.push("COMPLETENESS_OUT_OF_RANGE");
  }

  if (
    observation.freshnessMinutes !== undefined &&
    (!Number.isFinite(observation.freshnessMinutes) ||
      observation.freshnessMinutes < 0)
  ) {
    errors.push("FRESHNESS_INVALID");
  }

  return errors;
}

export function truthfulValue(
  observation: MetricObservation
): number | null {
  return observation.truthState === "value" ||
    observation.truthState === "partial"
    ? observation.value ?? null
    : null;
}
