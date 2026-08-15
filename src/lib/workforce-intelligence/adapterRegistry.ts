import type {
  IntelligenceAdapter,
  MetricId,
} from "./types";

export class IntelligenceAdapterRegistry {
  private readonly byMetric = new Map<MetricId, IntelligenceAdapter>();

  register(adapter: IntelligenceAdapter): void {
    if (!adapter.key.trim()) {
      throw new Error("Adapter key is required.");
    }

    for (const metricId of adapter.metricIds) {
      if (this.byMetric.has(metricId)) {
        throw new Error(`Duplicate metric binding: ${metricId}`);
      }
      this.byMetric.set(metricId, adapter);
    }
  }

  get(metricId: MetricId): IntelligenceAdapter | undefined {
    return this.byMetric.get(metricId);
  }

  boundMetricIds(): MetricId[] {
    return [...this.byMetric.keys()];
  }
}
