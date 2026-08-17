import type { EvidenceAdapterRegistry } from "./adapterRegistry";
import { validateEvidenceItemIntegrity } from "./lineage";
import { loadEvidenceWithPermission } from "./permissions";
import { validateEvidenceDataset } from "./truthfulState";
import type {
  EvidenceActor,
  EvidenceDataset,
  EvidencePermissionChecker,
} from "./types";

export class ComplianceEvidenceEngine {
  constructor(
    private readonly registry: EvidenceAdapterRegistry,
    private readonly permissionChecker: EvidencePermissionChecker,
    private readonly now: () => Date = () => new Date()
  ) {}

  async evaluate(input: {
    actor: EvidenceActor;
    requirementKey: string;
  }): Promise<EvidenceDataset> {
    const adapter = this.registry.get(input.requirementKey);

    if (!adapter) {
      return {
        requirementKey: input.requirementKey,
        state: "not_configured",
        items: [],
        asOfUtc: this.now().toISOString(),
        messageCode: "EVIDENCE_SOURCE_NOT_CONFIGURED",
      };
    }

    let dataset: EvidenceDataset;

    try {
      dataset = await loadEvidenceWithPermission({
        actor: input.actor,
        adapter,
        requirementKey: input.requirementKey,
        permissionChecker: this.permissionChecker,
        now: this.now(),
      });
    } catch {
      return {
        requirementKey: input.requirementKey,
        state: "error",
        items: [],
        asOfUtc: this.now().toISOString(),
        messageCode: "EVIDENCE_SOURCE_LOAD_FAILED",
      };
    }

    if (dataset.requirementKey !== input.requirementKey) {
      return {
        requirementKey: input.requirementKey,
        state: "error",
        items: [],
        asOfUtc: this.now().toISOString(),
        messageCode: "EVIDENCE_REQUIREMENT_MISMATCH",
      };
    }

    const truthErrors = validateEvidenceDataset(dataset);
    if (truthErrors.length > 0) {
      return {
        requirementKey: input.requirementKey,
        state: "error",
        items: [],
        asOfUtc: this.now().toISOString(),
        messageCode: truthErrors.join(","),
      };
    }

    for (const item of dataset.items) {
      const integrityErrors = validateEvidenceItemIntegrity(item);
      if (
        (item.state === "present" ||
          item.state === "legal_hold" ||
          item.state === "expired" ||
          item.state === "superseded") &&
        integrityErrors.some(e => e.startsWith("NON_AUTHORITATIVE_SOURCE"))
      ) {
        return {
          requirementKey: input.requirementKey,
          state: "present_partial",
          items: dataset.items,
          asOfUtc: dataset.asOfUtc,
          messageCode: "EVIDENCE_LINEAGE_REQUIRES_REVIEW",
        };
      }

      if (
        item.category === "controlled_document" &&
        integrityErrors.includes("CONTROLLED_DOCUMENT_VERSION_OR_HASH_REQUIRED")
      ) {
        return {
          requirementKey: input.requirementKey,
          state: "present_partial",
          items: dataset.items,
          asOfUtc: dataset.asOfUtc,
          messageCode: "CONTROLLED_DOCUMENT_INTEGRITY_REFERENCE_REQUIRED",
        };
      }
    }

    return dataset;
  }
}
