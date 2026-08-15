import type { CockpitAggregate } from "./aggregate";
import type { CockpitFilter } from "./filters";
import { filterCockpitItems } from "./filters";
import { calculateCockpitPriority } from "./priority";
import { summarizeCockpit } from "./summary";

export function buildCockpitViewModel(input: {
  aggregate: CockpitAggregate;
  filter?: CockpitFilter;
  now: Date;
}) {
  const items = input.aggregate.datasets.flatMap(dataset =>
    dataset.truthState === "value" || dataset.truthState === "partial"
      ? dataset.items
      : []
  );

  const filtered = filterCockpitItems(items, input.filter ?? {});

  const ranked = filtered
    .map(item => ({
      item,
      priority: calculateCockpitPriority(item, input.now),
    }))
    .sort((a, b) => b.priority.score - a.priority.score);

  return {
    asOfUtc: input.aggregate.asOfUtc,
    organizationId: input.aggregate.organizationId,
    summary: summarizeCockpit(input.aggregate.datasets, input.now),
    rankedItems: ranked,
    sourceStates: input.aggregate.datasets.map(dataset => ({
      source: dataset.source,
      truthState: dataset.truthState,
      messageCode: dataset.messageCode,
    })),
  };
}
