import type { CockpitItem, CockpitRisk, CockpitSource, CockpitStatus } from "./types";

export type CockpitFilter = {
  sources?: CockpitSource[];
  statuses?: CockpitStatus[];
  risks?: CockpitRisk[];
  ownerClasses?: string[];
  onlyWithDueDate?: boolean;
};

export function filterCockpitItems(
  items: CockpitItem[],
  filter: CockpitFilter
): CockpitItem[] {
  return items.filter(item => {
    if (filter.sources?.length && !filter.sources.includes(item.source)) return false;
    if (filter.statuses?.length && !filter.statuses.includes(item.status)) return false;
    if (filter.risks?.length && !filter.risks.includes(item.risk)) return false;
    if (filter.ownerClasses?.length && !filter.ownerClasses.includes(item.ownerClass ?? "")) return false;
    if (filter.onlyWithDueDate && !item.dueAtUtc) return false;
    return true;
  });
}
