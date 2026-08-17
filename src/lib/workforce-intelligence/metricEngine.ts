import type {
  IntelligenceActor,
  IntelligenceResult,
  MetricDimension,
  MetricId,
  MetricObservation,
} from "./types";
import type { IntelligenceAdapterRegistry } from "./adapterRegistry";
import { getMetricDefinition } from "./metricCatalog";
import {
  DEFAULT_MINIMUM_GROUP_SIZE,
  applySmallCellSuppression,
  type PrivacyThresholdPolicy,
} from "./privacyThresholds";
import { calculateConfidence } from "./confidence";
import { lineageSourceNames, validateLineage } from "./lineage";
import {
  truthfulValue,
  validateObservationTruthState,
} from "./truthfulState";

export type IntelligencePermissionChecker = (input: {
  actor: IntelligenceActor;
  metricId: MetricId;
  organizationId: string;
  dimension: MetricDimension;
}) => Promise<boolean>;

export class WorkforceIntelligenceEngine {
  constructor(
    private readonly registry: IntelligenceAdapterRegistry,
    private readonly permissionChecker: IntelligencePermissionChecker,
    private readonly privacyPolicy: PrivacyThresholdPolicy = {
      minimumGroupSize: DEFAULT_MINIMUM_GROUP_SIZE,
      suppressGroupedCounts: true,
      suppressGroupedRates: true,
    }
  ) {}

  async evaluate(input: {
    actor: IntelligenceActor;
    metricId: MetricId;
    dimension?: MetricDimension;
    dimensionValue?: string;
  }): Promise<IntelligenceResult> {
    const definition = getMetricDefinition(input.metricId);
    const dimension = input.dimension ?? "none";

    if (!definition.allowedDimensions.includes(dimension)) {
      return this.emptyResult(
        input.actor.organizationId,
        definition,
        "not_permitted",
        dimension,
        input.dimensionValue,
        ["Requested dimension is not approved for this metric."]
      );
    }

    const permitted = await this.permissionChecker({
      actor: input.actor,
      metricId: input.metricId,
      organizationId: input.actor.organizationId,
      dimension,
    });

    if (!permitted) {
      return this.emptyResult(
        input.actor.organizationId,
        definition,
        "not_permitted",
        dimension,
        input.dimensionValue,
        ["Metric is not permitted for the current actor/scope."]
      );
    }

    const adapter = this.registry.get(input.metricId);

    if (!adapter) {
      return this.emptyResult(
        input.actor.organizationId,
        definition,
        "not_configured",
        dimension,
        input.dimensionValue,
        ["No authoritative metric adapter is configured."]
      );
    }

    let observation: MetricObservation;

    try {
      observation = await adapter.load({
        actor: input.actor,
        metricId: input.metricId,
        dimension,
        dimensionValue: input.dimensionValue,
      });
    } catch {
      return this.emptyResult(
        input.actor.organizationId,
        definition,
        "error",
        dimension,
        input.dimensionValue,
        ["Authoritative metric adapter failed."]
      );
    }

    if (observation.organizationId !== input.actor.organizationId) {
      return this.emptyResult(
        input.actor.organizationId,
        definition,
        "error",
        dimension,
        input.dimensionValue,
        ["Cross-tenant metric observation rejected."]
      );
    }

    if (
      observation.metricId !== input.metricId ||
      observation.dimension !== dimension
    ) {
      return this.emptyResult(
        input.actor.organizationId,
        definition,
        "error",
        dimension,
        input.dimensionValue,
        ["Metric adapter returned a mismatched observation."]
      );
    }

    const truthErrors = validateObservationTruthState(observation);
    const lineageErrors = validateLineage(observation.lineage);

    if (truthErrors.length > 0) {
      return this.emptyResult(
        input.actor.organizationId,
        definition,
        "error",
        dimension,
        input.dimensionValue,
        truthErrors
      );
    }

    if (
      (observation.truthState === "value" ||
        observation.truthState === "partial") &&
      lineageErrors.length > 0
    ) {
      observation = {
        ...observation,
        truthState: "insufficient_evidence",
        value: undefined,
        caveats: [
          ...(observation.caveats ?? []),
          ...lineageErrors,
        ],
      };
    }

    const protectedObservation =
      observation.truthState === "value" ||
      observation.truthState === "partial"
        ? applySmallCellSuppression(observation, this.privacyPolicy)
        : observation;

    const confidence = calculateConfidence(protectedObservation);
    const value = truthfulValue(protectedObservation);

    return {
      metricId: input.metricId,
      organizationId: input.actor.organizationId,
      truthState: protectedObservation.truthState,
      value,
      unit: definition.unit,
      confidence,
      dimension,
      dimensionValue: input.dimensionValue,
      explanation: {
        definition: definition.description,
        formula: definition.formula,
        evidenceCoverage:
          protectedObservation.completeness !== undefined
            ? protectedObservation.completeness
            : null,
        freshnessMinutes:
          protectedObservation.freshnessMinutes !== undefined
            ? protectedObservation.freshnessMinutes
            : null,
        sources: lineageSourceNames(protectedObservation.lineage),
        caveats: protectedObservation.caveats ?? [],
        privacyMessage:
          protectedObservation.truthState === "suppressed_small_cell"
            ? "Result suppressed by the approved small-cell privacy policy."
            : undefined,
      },
    };
  }

  private emptyResult(
    organizationId: string,
    definition: ReturnType<typeof getMetricDefinition>,
    truthState: IntelligenceResult["truthState"],
    dimension: MetricDimension,
    dimensionValue: string | undefined,
    caveats: string[]
  ): IntelligenceResult {
    return {
      metricId: definition.id,
      organizationId,
      truthState,
      value: null,
      unit: definition.unit,
      confidence: "unknown",
      dimension,
      dimensionValue,
      explanation: {
        definition: definition.description,
        formula: definition.formula,
        evidenceCoverage: null,
        freshnessMinutes: null,
        sources: [],
        caveats,
      },
    };
  }
}
