import type { CockpitDataset, CockpitTruthState } from "./types";

export function createTruthfulDataset(input: {
  source: CockpitDataset["source"];
  truthState: CockpitTruthState;
  items?: CockpitDataset["items"];
  asOfUtc: string;
  messageCode?: string;
}): CockpitDataset {
  const items = input.items ?? [];

  if (input.truthState !== "value" && input.truthState !== "partial" && items.length > 0) {
    throw new Error(
      `Truth state ${input.truthState} cannot carry authoritative items.`
    );
  }

  return {
    source: input.source,
    truthState: input.truthState,
    items,
    asOfUtc: input.asOfUtc,
    messageCode: input.messageCode,
  };
}

export function authoritativeCount(dataset: CockpitDataset): number | null {
  if (dataset.truthState === "value" || dataset.truthState === "partial") {
    return dataset.items.length;
  }
  return null;
}
