import type { CockpitAdapter, CockpitSource } from "./types";

export class CockpitAdapterRegistry {
  private readonly adapters = new Map<CockpitSource, CockpitAdapter>();

  register(adapter: CockpitAdapter): void {
    if (this.adapters.has(adapter.source)) {
      throw new Error(`Duplicate cockpit adapter: ${adapter.source}`);
    }
    this.adapters.set(adapter.source, adapter);
  }

  get(source: CockpitSource): CockpitAdapter | undefined {
    return this.adapters.get(source);
  }

  values(): CockpitAdapter[] {
    return [...this.adapters.values()];
  }
}
