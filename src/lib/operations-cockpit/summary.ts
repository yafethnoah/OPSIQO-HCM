import type { CockpitDataset, CockpitItem } from "./types";
import { authoritativeCount } from "./truthfulState";
import { calculateCockpitPriority } from "./priority";

export type CockpitSourceSummary = {
  source: CockpitDataset["source"];
  truthState: CockpitDataset["truthState"];
  count: number | null;
};

export type CockpitSummary = {
  sources: CockpitSourceSummary[];
  totalAuthoritativeItems: number;
  criticalItems: number;
  highItems: number;
  overdueItems: number;
  blockedItems: number;
  reconciliationItems: number;
};

export function summarizeCockpit(
  datasets: CockpitDataset[],
  now: Date
): CockpitSummary {
  const authoritativeItems: CockpitItem[] = datasets.flatMap(dataset =>
    dataset.truthState === "value" || dataset.truthState === "partial"
      ? dataset.items
      : []
  );

  const priorities = authoritativeItems.map(item =>
    calculateCockpitPriority(item, now)
  );

  return {
    sources: datasets.map(dataset => ({
      source: dataset.source,
      truthState: dataset.truthState,
      count: authoritativeCount(dataset),
    })),
    totalAuthoritativeItems: authoritativeItems.length,
    criticalItems: priorities.filter(p => p.band === "critical").length,
    highItems: priorities.filter(p => p.band === "high").length,
    overdueItems: authoritativeItems.filter(i => i.status === "overdue").length,
    blockedItems: authoritativeItems.filter(i => i.status === "blocked").length,
    reconciliationItems: authoritativeItems.filter(
      i => i.status === "reconciliation_required"
    ).length,
  };
}
