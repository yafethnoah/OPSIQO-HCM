import type { EvidenceItem, EvidenceLineage } from "./types";

const SHA256_RE = /^[a-f0-9]{64}$/i;

export function validateEvidenceLineage(lineage: EvidenceLineage[]): string[] {
  const errors: string[] = [];

  if (lineage.length === 0) {
    errors.push("LINEAGE_REQUIRED");
    return errors;
  }

  for (const entry of lineage) {
    if (!entry.sourceKey.trim()) errors.push("SOURCE_KEY_REQUIRED");
    if (!entry.sourceSystem.trim()) errors.push("SOURCE_SYSTEM_REQUIRED");
    if (!entry.sourceRef.trim()) errors.push("SOURCE_REF_REQUIRED");
    if (!entry.authoritative) {
      errors.push(`NON_AUTHORITATIVE_SOURCE:${entry.sourceKey}`);
    }
    if (
      entry.integritySha256 &&
      !SHA256_RE.test(entry.integritySha256)
    ) {
      errors.push(`INVALID_SHA256:${entry.sourceKey}`);
    }
    if (!Number.isFinite(Date.parse(entry.observedAtUtc))) {
      errors.push(`INVALID_OBSERVED_AT:${entry.sourceKey}`);
    }
  }

  return [...new Set(errors)];
}

export function validateEvidenceItemIntegrity(item: EvidenceItem): string[] {
  const errors = validateEvidenceLineage(item.lineage);

  if (item.integritySha256 && !SHA256_RE.test(item.integritySha256)) {
    errors.push("INVALID_ITEM_SHA256");
  }

  if (
    item.category === "controlled_document" &&
    item.state === "present" &&
    !item.lineage.some(l => !!l.versionRef || !!l.integritySha256)
  ) {
    errors.push("CONTROLLED_DOCUMENT_VERSION_OR_HASH_REQUIRED");
  }

  return [...new Set(errors)];
}
