import type {
  CockpitActor,
  CockpitAdapter,
  CockpitDataset,
  CockpitPermissionChecker,
} from "./types";
import { createTruthfulDataset } from "./truthfulState";

export async function loadAdapterWithPermission(input: {
  actor: CockpitActor;
  adapter: CockpitAdapter;
  permissionChecker: CockpitPermissionChecker;
  now: Date;
}): Promise<CockpitDataset> {
  const permitted = await input.permissionChecker({
    actor: input.actor,
    source: input.adapter.source,
    organizationId: input.actor.organizationId,
  });

  if (!permitted) {
    return createTruthfulDataset({
      source: input.adapter.source,
      truthState: "not_permitted",
      asOfUtc: input.now.toISOString(),
      messageCode: "COCKPIT_SOURCE_NOT_PERMITTED",
    });
  }

  const dataset = await input.adapter.load({
    actor: input.actor,
    organizationId: input.actor.organizationId,
  });

  for (const item of dataset.items) {
    if (item.organizationId !== input.actor.organizationId) {
      throw new Error(
        `Cross-tenant cockpit item rejected: ${item.sourceRef}`
      );
    }
  }

  return dataset;
}
