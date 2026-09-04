import type {
  EvidenceActor,
  EvidenceAdapter,
  EvidenceDataset,
  EvidencePermissionChecker,
} from "./types";

export async function loadEvidenceWithPermission(input: {
  actor: EvidenceActor;
  adapter: EvidenceAdapter;
  requirementKey: string;
  permissionChecker: EvidencePermissionChecker;
  now: Date;
}): Promise<EvidenceDataset> {
  const permitted = await input.permissionChecker({
    actor: input.actor,
    organizationId: input.actor.organizationId,
    requirementKey: input.requirementKey,
  });

  if (!permitted) {
    return {
      requirementKey: input.requirementKey,
      state: "not_permitted",
      items: [],
      asOfUtc: input.now.toISOString(),
      messageCode: "EVIDENCE_NOT_PERMITTED",
    };
  }

  const dataset = await input.adapter.load({
    actor: input.actor,
    organizationId: input.actor.organizationId,
    requirementKey: input.requirementKey,
  });

  for (const item of dataset.items) {
    if (item.organizationId !== input.actor.organizationId) {
      throw new Error(
        `Cross-tenant evidence item rejected: ${item.sourceRef}`
      );
    }
  }

  return dataset;
}
