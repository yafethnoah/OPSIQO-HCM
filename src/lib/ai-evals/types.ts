export type EvalLanguage = "en" | "ar" | "fr" | "es";

export type EvalRiskClass =
  | "read_only"
  | "low"
  | "medium"
  | "high"
  | "consequential";

export type EvalExecutionMode =
  | "read_only"
  | "prepare_only"
  | "confirmed_write"
  | "review_only"
  | "blocked";

export type EvalResult =
  | "success"
  | "failure"
  | "blocked"
  | "reconciliation_required"
  | "not_executed";

export type EvalCommand = {
  id: string;
  language: EvalLanguage;
  text: string;
};

export type EvalContext = {
  organizationId: string;
  actorId: string;
  roleClass:
    | "employee"
    | "manager"
    | "hr"
    | "organization_admin"
    | "system_admin";
  permissions: string[];
  nowIso: string;
  simulateOnly: boolean;
  planExpired?: boolean;
  permissionRevokedAfterPlan?: boolean;
  replayExecution?: boolean;
  providerPrimaryAvailable?: boolean;
  providerFallbackAvailable?: boolean;
};

export type ExpectedBehavior = {
  intent: string;
  actionType: string;
  riskClass: EvalRiskClass;
  executionMode: EvalExecutionMode;
  requiresConfirmation: boolean;
  executed: boolean;
  result: EvalResult;
  requiredMissingFields?: string[];
  allowedAuthoritativeServices?: string[];
  mustBlockReasons?: string[];
  expectedLanguage?: EvalLanguage;
};

export type EvalCase = {
  id: string;
  category:
    | "intent"
    | "missing_fields"
    | "confirmation"
    | "consequential"
    | "authorization"
    | "tenant_isolation"
    | "duplicate_execution"
    | "expiry"
    | "reconciliation"
    | "fallback"
    | "multilingual"
    | "grounding";
  command: EvalCommand;
  context: EvalContext;
  expected: ExpectedBehavior;
  tags?: string[];
};

export type EvalObservation = {
  caseId: string;
  intent: string;
  actionType: string;
  riskClass: EvalRiskClass;
  executionMode: EvalExecutionMode;
  requiresConfirmation: boolean;
  executed: boolean;
  result: EvalResult;
  missingFields: string[];
  authoritativeService?: string;
  blockedReasons: string[];
  explanationLanguage?: EvalLanguage;
  explanationGrounded?: boolean;
  successReceiptIssued?: boolean;
  writeCount?: number;
  tenantScopeRespected?: boolean;
  permissionCheckedAtExecution?: boolean;
  planExpiryChecked?: boolean;
  usedFallbackProvider?: boolean;
  containedSensitiveData?: boolean;
  directFirestoreWrite?: boolean;
};

export type CaseEvaluation = {
  caseId: string;
  passed: boolean;
  score: number;
  dimensionResults: Record<string, boolean>;
  criticalFailures: string[];
  notes: string[];
};

export type EvalReport = {
  schemaVersion: "7.2";
  generatedAtUtc: string;
  caseCount: number;
  passedCaseCount: number;
  failedCaseCount: number;
  criticalFailureCount: number;
  dimensions: Record<
    string,
    { passed: number; total: number; rate: number; minimum: number; gatePass: boolean }
  >;
  cases: CaseEvaluation[];
  status: "AI_QUALITY_GATE_PASS" | "AI_QUALITY_GATE_FAIL";
};
