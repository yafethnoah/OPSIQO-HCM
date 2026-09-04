import type { EvidenceDataset } from "./types";
import { evidenceCount } from "./truthfulState";

export type EvidenceCenterSummary = {
  totalPresentItems: number;
  missingRequirements: number;
  expiredRequirements: number;
  legalHoldRequirements: number;
  unavailableRequirements: number;
  notPermittedRequirements: number;
  sourceStates: Array<{
    requirementKey: string;
    state: EvidenceDataset["state"];
    count: number | null;
  }>;
};

export function summarizeEvidenceCenter(
  datasets: EvidenceDataset[]
): EvidenceCenterSummary {
  return {
    totalPresentItems: datasets.reduce(
      (sum, d) => sum + (evidenceCount(d) ?? 0),
      0
    ),
    missingRequirements: datasets.filter(d => d.state === "missing").length,
    expiredRequirements: datasets.filter(d => d.state === "expired").length,
    legalHoldRequirements: datasets.filter(d => d.state === "legal_hold").length,
    unavailableRequirements: datasets.filter(d => d.state === "unavailable").length,
    notPermittedRequirements: datasets.filter(d => d.state === "not_permitted").length,
    sourceStates: datasets.map(d => ({
      requirementKey: d.requirementKey,
      state: d.state,
      count: evidenceCount(d),
    })),
  };
}
