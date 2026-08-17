import type { MetricObservation } from "./types";

export const DEFAULT_MINIMUM_GROUP_SIZE = 5;

export type PrivacyThresholdPolicy = {
  minimumGroupSize: number;
  suppressGroupedCounts: boolean;
  suppressGroupedRates: boolean;
};

export function validatePrivacyThresholdPolicy(
  policy: PrivacyThresholdPolicy
): void {
  if (
    !Number.isInteger(policy.minimumGroupSize) ||
    policy.minimumGroupSize < 2 ||
    policy.minimumGroupSize > 100
  ) {
    throw new Error("minimumGroupSize must be an integer between 2 and 100.");
  }
}

export function applySmallCellSuppression(
  observation: MetricObservation,
  policy: PrivacyThresholdPolicy
): MetricObservation {
  validatePrivacyThresholdPolicy(policy);

  if (observation.dimension === "none") {
    return observation;
  }

  const grouped = typeof observation.groupSize === "number";

  if (!grouped) {
    return {
      ...observation,
      truthState: "insufficient_evidence",
      value: undefined,
      caveats: [
        ...(observation.caveats ?? []),
        "Grouped result lacks an authoritative group size for privacy review.",
      ],
    };
  }

  if (observation.groupSize! < policy.minimumGroupSize) {
    return {
      ...observation,
      truthState: "suppressed_small_cell",
      value: undefined,
      numerator: undefined,
      denominator: undefined,
      caveats: [
        ...(observation.caveats ?? []),
        `Grouped result suppressed because group size is below ${policy.minimumGroupSize}.`,
      ],
    };
  }

  return observation;
}
