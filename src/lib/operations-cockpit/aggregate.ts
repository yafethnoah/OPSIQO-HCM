import type {
  CockpitActor,
  CockpitAdapter,
  CockpitDataset,
  CockpitPermissionChecker,
} from "./types";
import { loadAdapterWithPermission } from "./permissions";

export type CockpitAggregate = {
  organizationId: string;
  actorUid: string;
  asOfUtc: string;
  datasets: CockpitDataset[];
};

export async function aggregateCockpit(input: {
  actor: CockpitActor;
  adapters: CockpitAdapter[];
  permissionChecker: CockpitPermissionChecker;
  now: Date;
}): Promise<CockpitAggregate> {
  const datasets: CockpitDataset[] = [];

  for (const adapter of input.adapters) {
    try {
      datasets.push(
        await loadAdapterWithPermission({
          actor: input.actor,
          adapter,
          permissionChecker: input.permissionChecker,
          now: input.now,
        })
      );
    } catch {
      datasets.push({
        source: adapter.source,
        truthState: "error",
        items: [],
        asOfUtc: input.now.toISOString(),
        messageCode: "COCKPIT_SOURCE_LOAD_FAILED",
      });
    }
  }

  return {
    organizationId: input.actor.organizationId,
    actorUid: input.actor.uid,
    asOfUtc: input.now.toISOString(),
    datasets,
  };
}
