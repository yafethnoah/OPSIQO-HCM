export type ExperimentDomain =
  | "navigation"
  | "presentation"
  | "help_content"
  | "progress_visualization"
  | "gantt_presentation"
  | "dashboard_layout"
  | "loading_state"
  | "accessibility_presentation"
  | "search_presentation"
  | "authentication"
  | "authorization"
  | "tenant_isolation"
  | "compliance"
  | "privacy"
  | "payroll"
  | "compensation"
  | "candidate_decision"
  | "employee_decision"
  | "leave_entitlement"
  | "health_safety"
  | "document_security"
  | "backup_restore"
  | "ai_consequential"
  | "data_integrity"
  | "other";

export type ExperimentMode =
  | "disabled"
  | "rollout_only"
  | "ab_test";

export type ExperimentEligibility =
  | "eligible_rollout"
  | "eligible_ab_test"
  | "review_required"
  | "prohibited";

export type FeatureFlagDefinition = {
  key: string;
  description: string;
  domain: ExperimentDomain;
  defaultValue: boolean | string | number;
  mode: ExperimentMode;
  owner: string;
  expiresOn: string;
  killSwitch: boolean;
};

export type ExperimentProposal = {
  id: string;
  title: string;
  domain: ExperimentDomain;
  changesAuthorization: boolean;
  changesTenantIsolation: boolean;
  changesComplianceOutcome: boolean;
  changesPrivacyConsent: boolean;
  changesIndividualHrDecision: boolean;
  changesCompensationOrPayroll: boolean;
  changesLeaveEntitlement: boolean;
  changesHealthSafetyControl: boolean;
  changesDocumentSecurity: boolean;
  changesBackupOrRestore: boolean;
  changesConsequentialAiBehavior: boolean;
  changesIdempotencyOrReconciliation: boolean;
  analyticsApproved: boolean;
  consentReviewed: boolean;
  requestedMode: ExperimentMode;
};

export type EligibilityResult = {
  eligibility: ExperimentEligibility;
  reasons: string[];
  allowedMode: ExperimentMode;
};

export type PortfolioCandidate = {
  id: string;
  title: string;
  evidenceStrength: 0 | 1 | 2 | 3 | 4 | 5;
  userValue: 0 | 1 | 2 | 3 | 4 | 5;
  strategicAlignment: 0 | 1 | 2 | 3 | 4 | 5;
  reliabilityBenefit: 0 | 1 | 2 | 3 | 4 | 5;
  securityPrivacyRisk: 0 | 1 | 2 | 3 | 4 | 5;
  implementationEffort: 0 | 1 | 2 | 3 | 4 | 5;
  changeRisk: 0 | 1 | 2 | 3 | 4 | 5;
};

export type PortfolioScore = {
  id: string;
  score: number;
  normalizedScore: number;
  recommendation:
    | "prioritize"
    | "consider"
    | "defer"
    | "governance_review";
  reasons: string[];
};
