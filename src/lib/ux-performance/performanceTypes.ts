export type CoreWebVitalName = "LCP" | "INP" | "CLS";
export type WebMetricRating = "good" | "needs-improvement" | "poor";

export type RouteGroup =
  | "home"
  | "core_hr"
  | "leave"
  | "recruiting"
  | "onboarding"
  | "documents"
  | "imports"
  | "studio"
  | "analytics"
  | "admin"
  | "other";

export type PerformanceMetricPayload = {
  metricName: string;
  value: number;
  delta: number;
  rating: WebMetricRating;
  routeGroup: RouteGroup;
  navigationType?: string;
  timestampUtc: string;
};

export type OperationStageId =
  | "queued"
  | "preparing"
  | "validating"
  | "interpreting"
  | "planning"
  | "awaiting_confirmation"
  | "executing"
  | "verifying"
  | "reconciliation"
  | "completed"
  | "failed"
  | "cancelled";

export type OperationStage = {
  id: OperationStageId;
  label: string;
  status: "waiting" | "active" | "complete" | "failed";
};

export type OperationProgressState = {
  stages: OperationStage[];
  percent: number | null;
  indeterminate: boolean;
  currentStageId: OperationStageId;
  message: string;
};
