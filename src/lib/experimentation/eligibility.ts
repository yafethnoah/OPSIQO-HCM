import type {
  EligibilityResult,
  ExperimentProposal,
  ExperimentDomain,
} from "./types";

const PROHIBITED_DOMAINS = new Set<ExperimentDomain>([
  "authentication",
  "authorization",
  "tenant_isolation",
  "compliance",
  "privacy",
  "payroll",
  "compensation",
  "candidate_decision",
  "employee_decision",
  "leave_entitlement",
  "health_safety",
  "document_security",
  "backup_restore",
  "ai_consequential",
  "data_integrity",
]);

const ROLLOUT_FRIENDLY_DOMAINS = new Set<ExperimentDomain>([
  "navigation",
  "presentation",
  "help_content",
  "progress_visualization",
  "gantt_presentation",
  "dashboard_layout",
  "loading_state",
  "accessibility_presentation",
  "search_presentation",
]);

export function evaluateExperimentEligibility(
  proposal: ExperimentProposal
): EligibilityResult {
  const reasons: string[] = [];

  if (PROHIBITED_DOMAINS.has(proposal.domain)) {
    reasons.push(`Domain "${proposal.domain}" is prohibited from experimentation.`);
  }

  const prohibitedImpacts: Array<[boolean, string]> = [
    [proposal.changesAuthorization, "Changes authorization/RBAC."],
    [proposal.changesTenantIsolation, "Changes tenant isolation."],
    [proposal.changesComplianceOutcome, "Changes legal/compliance outcome."],
    [proposal.changesPrivacyConsent, "Changes privacy consent."],
    [proposal.changesIndividualHrDecision, "Changes an individual HR decision."],
    [proposal.changesCompensationOrPayroll, "Changes compensation/payroll."],
    [proposal.changesLeaveEntitlement, "Changes leave entitlement."],
    [proposal.changesHealthSafetyControl, "Changes health/safety control."],
    [proposal.changesDocumentSecurity, "Changes document security/DLP."],
    [proposal.changesBackupOrRestore, "Changes backup/restore behavior."],
    [proposal.changesConsequentialAiBehavior, "Changes consequential AI behavior."],
    [proposal.changesIdempotencyOrReconciliation, "Changes idempotency/reconciliation."],
  ];

  for (const [triggered, reason] of prohibitedImpacts) {
    if (triggered) reasons.push(reason);
  }

  if (reasons.length > 0) {
    return {
      eligibility: "prohibited",
      reasons,
      allowedMode: "disabled",
    };
  }

  if (!ROLLOUT_FRIENDLY_DOMAINS.has(proposal.domain)) {
    return {
      eligibility: "review_required",
      reasons: ["Domain requires governance review before experimentation."],
      allowedMode: "rollout_only",
    };
  }

  if (proposal.requestedMode === "ab_test") {
    if (!proposal.analyticsApproved) {
      return {
        eligibility: "review_required",
        reasons: ["A/B testing requires approved Analytics use."],
        allowedMode: "rollout_only",
      };
    }
    if (!proposal.consentReviewed) {
      return {
        eligibility: "review_required",
        reasons: ["A/B testing requires consent/legal-basis review."],
        allowedMode: "rollout_only",
      };
    }

    return {
      eligibility: "eligible_ab_test",
      reasons: ["Non-consequential experience experiment passed eligibility checks."],
      allowedMode: "ab_test",
    };
  }

  return {
    eligibility: "eligible_rollout",
    reasons: ["Non-consequential experience change passed rollout eligibility checks."],
    allowedMode: "rollout_only",
  };
}
