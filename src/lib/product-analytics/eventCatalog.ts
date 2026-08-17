export const OPSIQO_ANALYTICS_EVENTS = {
  PAGE_VIEW: "opsiqo_page_view",
  SEARCH_STARTED: "opsiqo_search_started",
  SEARCH_COMPLETED: "opsiqo_search_completed",
  NAVIGATION_COMPLETED: "opsiqo_navigation_completed",

  WORKFLOW_STARTED: "opsiqo_workflow_started",
  WORKFLOW_VALIDATION_FAILED: "opsiqo_workflow_validation_failed",
  WORKFLOW_SUBMITTED: "opsiqo_workflow_submitted",
  WORKFLOW_COMPLETED: "opsiqo_workflow_completed",
  WORKFLOW_ABANDONED: "opsiqo_workflow_abandoned",

  APPROVAL_QUEUE_VIEWED: "opsiqo_approval_queue_viewed",
  APPROVAL_ACTION_COMPLETED: "opsiqo_approval_action_completed",

  IMPORT_STARTED: "opsiqo_import_started",
  IMPORT_VALIDATION_COMPLETED: "opsiqo_import_validation_completed",
  IMPORT_REVIEW_COMPLETED: "opsiqo_import_review_completed",
  IMPORT_REJECTED: "opsiqo_import_rejected",

  DOCUMENT_UPLOAD_STARTED: "opsiqo_document_upload_started",
  DOCUMENT_SCAN_BLOCKED: "opsiqo_document_scan_blocked",
  DOCUMENT_DOWNLOAD_AUTHORIZED: "opsiqo_document_download_authorized",
  DOCUMENT_DOWNLOAD_BLOCKED: "opsiqo_document_download_blocked",

  AI_COMMAND_STARTED: "opsiqo_ai_command_started",
  AI_INTENT_RESOLVED: "opsiqo_ai_intent_resolved",
  AI_PLAN_READY: "opsiqo_ai_plan_ready",
  AI_PLAN_CONFIRMED: "opsiqo_ai_plan_confirmed",
  AI_PLAN_CANCELLED: "opsiqo_ai_plan_cancelled",
  AI_EXECUTION_COMPLETED: "opsiqo_ai_execution_completed",
  AI_EXECUTION_FAILED: "opsiqo_ai_execution_failed",
  AI_RECONCILIATION_REQUIRED: "opsiqo_ai_reconciliation_required",
  AI_CONSEQUENTIAL_ACTION_BLOCKED: "opsiqo_ai_consequential_action_blocked",
} as const;

export type OpsiQoAnalyticsEvent =
  typeof OPSIQO_ANALYTICS_EVENTS[keyof typeof OPSIQO_ANALYTICS_EVENTS];

export const ALLOWED_EVENT_NAMES = new Set<OpsiQoAnalyticsEvent>(
  Object.values(OPSIQO_ANALYTICS_EVENTS)
);

export const ALLOWED_PARAMETER_NAMES = new Set([
  "module",
  "workflow",
  "action_type",
  "result",
  "role_class",
  "risk_class",
  "language",
  "device_class",
  "duration_bucket",
  "failure_category",
  "confirmation_required",
  "confirmation_result",
  "reconciliation_required",
  "route_group",
  "search_result_bucket",
  "validation_result",
  "import_type",
  "document_action",
  "ai_intent_class",
  "ai_execution_mode",
  "source_surface",
]);

export const VALUE_ALLOWLISTS: Record<string, ReadonlySet<string>> = {
  module: new Set([
    "home", "superapp", "core_hr", "leave", "recruiting", "onboarding",
    "documents", "imports", "studio", "ai", "analytics", "admin", "other"
  ]),
  result: new Set(["success", "failure", "cancelled", "blocked", "partial"]),
  role_class: new Set([
    "employee", "manager", "hr", "organization_admin", "system_admin", "guest", "unknown"
  ]),
  risk_class: new Set(["read_only", "low", "medium", "high", "consequential"]),
  device_class: new Set(["desktop", "tablet", "mobile", "unknown"]),
  duration_bucket: new Set([
    "lt_250ms", "250_1000ms", "1_3s", "3_10s", "10_30s", "gt_30s", "unknown"
  ]),
  confirmation_required: new Set(["true", "false"]),
  confirmation_result: new Set(["confirmed", "cancelled", "not_required", "expired"]),
  reconciliation_required: new Set(["true", "false"]),
  validation_result: new Set(["passed", "failed", "partial"]),
  ai_execution_mode: new Set(["read_only", "prepare_only", "confirmed_write", "blocked"]),
};

export const MAX_PARAM_VALUE_LENGTH = 64;
