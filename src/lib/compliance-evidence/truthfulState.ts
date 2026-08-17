import type { EvidenceDataset, EvidenceState } from "./types";

const ITEM_STATES = new Set<EvidenceState>([
  "present",
  "present_partial",
  "expired",
  "superseded",
  "legal_hold",
]);

export function validateEvidenceDataset(dataset: EvidenceDataset): string[] {
  const errors: string[] = [];

  if (!dataset.requirementKey.trim()) {
    errors.push("REQUIREMENT_KEY_REQUIRED");
  }

  if (dataset.items.length > 0 && !ITEM_STATES.has(dataset.state)) {
    errors.push("ITEMS_NOT_ALLOWED_FOR_DATASET_STATE");
  }

  if (
    (dataset.state === "present" ||
      dataset.state === "present_partial" ||
      dataset.state === "expired" ||
      dataset.state === "superseded" ||
      dataset.state === "legal_hold") &&
    dataset.items.length === 0
  ) {
    errors.push("EVIDENCE_ITEMS_REQUIRED");
  }

  return errors;
}

export function evidenceCount(dataset: EvidenceDataset): number | null {
  return ITEM_STATES.has(dataset.state) ? dataset.items.length : null;
}
