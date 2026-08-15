export type IntelligenceTruthState =
  | "value"
  | "suppressed_small_cell"
  | "insufficient_evidence"
  | "not_configured"
  | "not_assessed"
  | "unavailable"
  | "not_permitted"
  | "partial"
  | "error";

export type IntelligenceConfidence =
  | "high"
  | "medium"
  | "low"
  | "unknown";

export type MetricUnit =
  | "count"
  | "percent"
  | "ratio"
  | "days"
  | "hours";

export type MetricDimension =
  | "organization_unit"
  | "location_category"
  | "job_family"
  | "employment_type"
  | "month"
  | "quarter"
  | "source_module"
  | "none";

export type MetricId =
  | "active_headcount"
  | "hires"
  | "exits"
  | "workforce_movement"
  | "turnover_rate"
  | "vacancy_count"
  | "vacancy_rate"
  | "average_span_of_control"
  | "onboarding_completion_rate"
  | "onboarding_overdue_rate"
  | "offboarding_completion_rate"
  | "training_completion_rate"
  | "policy_acknowledgement_completion_rate"
  | "approval_average_age_days"
  | "workflow_completion_rate"
  | "blocked_workflow_rate"
  | "import_review_backlog"
  | "document_exception_backlog"
  | "orchestrator_reconciliation_rate"
  | "compliance_task_completion_rate"
  | "overdue_compliance_tasks"
  | "mandatory_evidence_coverage";

export type MetricDefinition = {
  id: MetricId;
  title: string;
  description: string;
  formula: string;
  unit: MetricUnit;
  category: "workforce" | "lifecycle" | "operations" | "compliance";
  allowedDimensions: MetricDimension[];
  individualScoring: false;
};

export type MetricLineage = {
  sourceKey: string;
  sourceSystem: string;
  authoritative: boolean;
  evidenceRefs: string[];
  asOfUtc: string;
  periodStartUtc?: string;
  periodEndUtc?: string;
};

export type MetricObservation = {
  metricId: MetricId;
  organizationId: string;
  truthState: IntelligenceTruthState;
  value?: number;
  numerator?: number;
  denominator?: number;
  groupSize?: number;
  dimension: MetricDimension;
  dimensionValue?: string;
  completeness?: number;
  freshnessMinutes?: number;
  lineage: MetricLineage[];
  caveats?: string[];
};

export type IntelligenceResult = {
  metricId: MetricId;
  organizationId: string;
  truthState: IntelligenceTruthState;
  value: number | null;
  unit: MetricUnit;
  confidence: IntelligenceConfidence;
  dimension: MetricDimension;
  dimensionValue?: string;
  explanation: {
    definition: string;
    formula: string;
    evidenceCoverage: number | null;
    freshnessMinutes: number | null;
    sources: string[];
    caveats: string[];
    privacyMessage?: string;
  };
};

export type IntelligenceActor = {
  uid: string;
  organizationId: string;
  roleClass: string;
};

export type IntelligenceAdapter = {
  key: string;
  metricIds: MetricId[];
  load(input: {
    actor: IntelligenceActor;
    metricId: MetricId;
    dimension: MetricDimension;
    dimensionValue?: string;
  }): Promise<MetricObservation>;
};
