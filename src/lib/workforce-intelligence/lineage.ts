import type { MetricLineage } from "./types";

export function validateLineage(lineage: MetricLineage[]): string[] {
  const errors: string[] = [];

  if (lineage.length === 0) {
    errors.push("LINEAGE_REQUIRED");
    return errors;
  }

  for (const item of lineage) {
    if (!item.sourceKey.trim()) errors.push("SOURCE_KEY_REQUIRED");
    if (!item.sourceSystem.trim()) errors.push("SOURCE_SYSTEM_REQUIRED");
    if (!item.authoritative) errors.push(`NON_AUTHORITATIVE_SOURCE:${item.sourceKey}`);

    const asOf = Date.parse(item.asOfUtc);
    if (!Number.isFinite(asOf)) errors.push(`INVALID_AS_OF:${item.sourceKey}`);
  }

  return [...new Set(errors)];
}

export function lineageSourceNames(lineage: MetricLineage[]): string[] {
  return [...new Set(lineage.map(item => item.sourceSystem))];
}
