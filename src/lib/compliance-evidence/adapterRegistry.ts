import type { EvidenceAdapter } from "./types";

export class EvidenceAdapterRegistry {
  private readonly byRequirement = new Map<string, EvidenceAdapter>();

  register(adapter: EvidenceAdapter): void {
    if (!adapter.key.trim()) throw new Error("Adapter key is required.");

    for (const requirementKey of adapter.requirementKeys) {
      if (this.byRequirement.has(requirementKey)) {
        throw new Error(
          `Duplicate evidence requirement binding: ${requirementKey}`
        );
      }
      this.byRequirement.set(requirementKey, adapter);
    }
  }

  get(requirementKey: string): EvidenceAdapter | undefined {
    return this.byRequirement.get(requirementKey);
  }

  boundRequirements(): string[] {
    return [...this.byRequirement.keys()];
  }
}
